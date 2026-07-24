import { Injectable } from '@nestjs/common';
import type { AuthUser } from './decorators/current-user.decorator';

const AUTH_USER_CACHE_TTL_MS = 60_000;

@Injectable()
export class AuthUserCacheService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: AuthUser }
  >();

  get(userId: string): AuthUser | null {
    const cached = this.cache.get(userId);
    if (!cached || cached.expiresAt <= Date.now()) {
      return null;
    }
    return cached.value;
  }

  set(userId: string, value: AuthUser) {
    this.cache.set(userId, {
      expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
      value,
    });
  }

  invalidate(userId: string) {
    this.cache.delete(userId);
  }
}
