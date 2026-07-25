import {
  EASYMATCH_API_PORT,
  EASYMATCH_WEB_URL,
} from '@easymatch/shared';
import {
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { freeDevPort } from './dev-port.util';

function devRequestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      Logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} in ${ms}ms`,
        'HTTP',
      );
    });
    next();
  };
}

async function listenExpressApp(
  expressApp: express.Express,
  port: number,
  isDev: boolean,
) {
  const maxAttempts = isDev ? 15 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onListening = () => {
          Logger.log(
            `Listening on ${isDev ? 'localhost' : '0.0.0.0'}:${port} (initializing…)`,
            'Bootstrap',
          );
          resolve();
        };
        const host = isDev ? undefined : '0.0.0.0';
        const server = host
          ? expressApp.listen(port, host, onListening)
          : expressApp.listen(port, onListening);
        server.on('error', reject);
      });
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EADDRINUSE' || attempt === maxAttempts) {
        if (err.code === 'EADDRINUSE') {
          Logger.error(
            `Port ${port} is still in use. From the repo root run: npm run stop`,
            'Bootstrap',
          );
        }
        throw error;
      }

      const freed = isDev ? await freeDevPort(port) : false;
      if (freed) {
        Logger.warn(`Cleared stale listener on port ${port}`, 'Bootstrap');
      }

      const waitMs = process.platform === 'win32' ? 1_500 : 1_000;
      Logger.warn(
        `Port ${port} busy (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs / 1_000}s…`,
        'Bootstrap',
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function bootstrap() {
  Logger.log('Bootstrapping Easymatch API…', 'Bootstrap');

  const expressApp = express();
  let healthStatus: 'starting' | 'ok' = 'starting';
  expressApp.get('/api/v1/health', (_req, res) => {
    res.json({
      status: healthStatus,
      timestamp: new Date().toISOString(),
    });
  });

  const port = Number(process.env.PORT) || EASYMATCH_API_PORT;
  const isDev = process.env.NODE_ENV !== 'production';

  await listenExpressApp(expressApp, port, isDev);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  const config = app.get(ConfigService);
  const isDevRuntime =
    config.get<string>('NODE_ENV', 'development') !== 'production';

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    Logger.log(`Received ${signal}, shutting down…`, 'Bootstrap');
    const forceExit = setTimeout(() => process.exit(0), 3_000);
    forceExit.unref();
    try {
      await app.close();
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));

  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = (config.get<string>('CORS_ORIGIN', EASYMATCH_WEB_URL) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    exposedHeaders: [
      'Content-Disposition',
      'X-Export-Row-Count',
      'X-Export-Truncated',
    ],
  });

  if (isDevRuntime) {
    app.use(devRequestLogger());
  }

  await app.init();

  healthStatus = 'ok';
  Logger.log(`API ready on 0.0.0.0:${port}/api/v1`, 'Bootstrap');

  if (isDevRuntime) {
    const officerCount = (config.get<string>('VERIFICATION_OFFICER_PHONES', '') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
    const adminCount = (config.get<string>('SUPER_ADMIN_PHONES', '') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
    const officerEmailCount = (config.get<string>('VERIFICATION_OFFICER_EMAILS', '') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
    const adminEmailCount = (config.get<string>('SUPER_ADMIN_EMAILS', '') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
    const consultantPhoneCount = (config.get<string>('MARRIAGE_CONSULTANT_PHONES', '') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
    const consultantEmailCount = (config.get<string>('MARRIAGE_CONSULTANT_EMAILS', '') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
    Logger.log(
      `Role env: ${officerCount} officer phone(s), ${adminCount} admin phone(s), ${consultantPhoneCount} consultant phone(s), ${officerEmailCount} officer email(s), ${adminEmailCount} admin email(s), ${consultantEmailCount} consultant email(s)`,
      'Bootstrap',
    );
  }
}

bootstrap().catch((error) => {
  Logger.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
    'Bootstrap',
  );
  process.exit(1);
});
