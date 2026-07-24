import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type MemoryEntry = {
  value: string;
  expiresAt: number | null;
};
const REDIS_OP_TIMEOUT_MS = 1_500;
const ERROR_LOG_THROTTLE_MS = 60_000;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private readonly allowMemoryFallback: boolean;
  private readonly memoryOnly: boolean;
  private readonly memory = new Map<string, MemoryEntry>();
  private redisReady = false;
  private warnedMemoryFallback = false;
  private clientDisabled = false;
  private lastErrorLogAt = 0;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL', '').trim();
    this.allowMemoryFallback =
      config.get<string>('NODE_ENV', 'development') !== 'production';
    this.memoryOnly =
      this.allowMemoryFallback &&
      (!redisUrl || redisUrl.toLowerCase() === 'memory');

    if (this.memoryOnly) {
      this.logger.warn(
        'REDIS_URL is empty or "memory". Using in-memory store (development only).',
      );
      return;
    }

    if (!redisUrl) {
      throw new Error(
        'REDIS_URL is required in production. Set REDIS_URL=memory for local dev without Redis.',
      );
    }

    const useTls = redisUrl.startsWith('rediss://');

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10_000,
      keepAlive: 30_000,
      retryStrategy: (times) => {
        if (this.clientDisabled) {
          return null;
        }
        return Math.min(times * 500, 5_000);
      },
      ...(useTls ? { tls: {} } : {}),
    });

    this.client.on('ready', () => {
      this.redisReady = true;
    });

    this.client.on('error', (err: Error) => {
      this.redisReady = false;
      this.logConnectionError(err);
      if (this.allowMemoryFallback && this.isPermanentConnectionError(err)) {
        this.disableRedisClient(err.message);
      }
    });
  }

  async onModuleInit() {
    if (this.memoryOnly) {
      return;
    }

    try {
      await this.pingWithTimeout(8_000);
      this.redisReady = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (this.allowMemoryFallback) {
        this.disableRedisClient(message);
        return;
      }
      throw err;
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Redis client is not available in memory-only mode.',
      );
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.withStore(
      () => this.redisClient().get(key),
      () => this.memoryGet(key),
    );
  }

  async getDel(key: string): Promise<string | null> {
    return this.withStore(
      async () => {
        const result = await this.redisClient().getdel(key);
        return result;
      },
      () => this.memoryGetDel(key),
    );
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.withStore(
      () => this.redisClient().set(key, value, 'EX', ttlSeconds),
      () => {
        this.memorySet(key, value, ttlSeconds);
      },
    );
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.withStore(
      () => this.redisClient().del(...keys),
      () => {
        for (const key of keys) {
          this.memory.delete(key);
        }
      },
    );
  }

  async del(key: string): Promise<void> {
    await this.withStore(
      () => this.redisClient().del(key),
      () => {
        this.memory.delete(key);
      },
    );
  }

  async incr(key: string): Promise<number> {
    return this.withStore(
      () => this.redisClient().incr(key),
      () => this.memoryIncr(key),
    );
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.withStore(
      () => this.redisClient().expire(key, ttlSeconds),
      () => {
        const entry = this.memory.get(key);
        if (!entry) return;
        entry.expiresAt = Date.now() + ttlSeconds * 1000;
        this.memory.set(key, entry);
      },
    );
  }

  async onModuleDestroy() {
    if (this.redisReady && this.client) {
      await this.client.quit();
    }
  }

  private redisClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client is not configured');
    }
    return this.client;
  }

  private disableRedisClient(reason: string) {
    if (this.clientDisabled) {
      return;
    }
    this.clientDisabled = true;
    this.redisReady = false;
    this.warnMemoryFallbackOnce();
    this.logger.warn(
      `Redis disabled for this process (${reason}). Using in-memory store (development only).`,
    );
    if (this.client) {
      this.client.disconnect(false);
    }
  }

  private isPermanentConnectionError(err: Error): boolean {
    const message = err.message.toLowerCase();
    return (
      message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('certificate') ||
      message.includes('wrong version number')
    );
  }

  private logConnectionError(err: Error) {
    const now = Date.now();
    if (now - this.lastErrorLogAt < ERROR_LOG_THROTTLE_MS) {
      return;
    }
    this.lastErrorLogAt = now;
    const level = this.allowMemoryFallback ? 'warn' : 'error';
    this.logger[level](`Redis connection error: ${err.message}`);
  }

  private async pingWithTimeout(timeoutMs: number) {
    if (!this.client) {
      throw new Error('Redis client not configured');
    }
    await Promise.race([
      this.client.ping(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Redis ping timed out')), timeoutMs);
      }),
    ]);
  }

  private async withStore<T>(
    redisOp: () => Promise<T>,
    memoryOp: () => T | void,
  ): Promise<T> {
    if (this.redisReady && this.client && !this.clientDisabled) {
      try {
        return await Promise.race([
          redisOp(),
          new Promise<T>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Redis op timed out after ${REDIS_OP_TIMEOUT_MS}ms`)),
              REDIS_OP_TIMEOUT_MS,
            );
          }),
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.redisReady = false;
        if (this.allowMemoryFallback) {
          this.disableRedisClient(message);
        } else {
          this.logger.error(`Redis operation failed: ${message}`);
          throw new ServiceUnavailableException(
            'Cache service is temporarily unavailable. Please try again.',
          );
        }
      }
    }

    if (this.allowMemoryFallback) {
      this.warnMemoryFallbackOnce();
      return memoryOp() as T;
    }

    throw new ServiceUnavailableException(
      'Cache service is temporarily unavailable. Please try again.',
    );
  }

  private warnMemoryFallbackOnce() {
    if (this.warnedMemoryFallback) return;
    this.warnedMemoryFallback = true;
    this.logger.warn(
      'Serving Redis-backed features from in-memory fallback (development only).',
    );
  }

  private purgeExpired(key: string) {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry;
  }

  private memoryGet(key: string): string | null {
    const entry = this.purgeExpired(key);
    return entry?.value ?? null;
  }

  private memoryGetDel(key: string): string | null {
    const entry = this.purgeExpired(key);
    if (!entry) return null;
    this.memory.delete(key);
    return entry.value;
  }

  private memorySet(key: string, value: string, ttlSeconds: number) {
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private memoryIncr(key: string): number {
    const entry = this.purgeExpired(key);
    const next = entry ? Number.parseInt(entry.value, 10) + 1 : 1;
    const expiresAt = entry?.expiresAt ?? null;
    this.memory.set(key, { value: String(next), expiresAt });
    return next;
  }
}
