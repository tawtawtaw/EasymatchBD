import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { isStaffRole } from '@easymatch/shared';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { StaffAuditService } from './staff-audit.service';

const SKIP_PATH_PREFIXES = ['/health', '/admin/audit-log'];
const SKIP_PATH_INCLUDES = [
  '/admin/profiles/export.csv',
  '/biodata-export',
];

@Injectable()
export class StaffAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: StaffAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
      user?: AuthUser;
      params?: Record<string, string>;
      body?: unknown;
    }>();

    const user = request.user;
    const method = request.method ?? 'GET';
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0] ?? '';

    if (
      !user ||
      !isStaffRole(user.role) ||
      SKIP_PATH_PREFIXES.some((prefix) => path.includes(prefix)) ||
      SKIP_PATH_INCLUDES.some((segment) => path.includes(segment))
    ) {
      return next.handle();
    }

    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const isSensitiveRead =
      method === 'GET' &&
      (path.includes('/chat-history') ||
        path.includes('/verification/submissions/') ||
        path.includes('/admin/consultant/cases/'));

    if (!isMutation && !isSensitiveRead) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.audit.logHttpAction(
          user,
          method,
          path,
          request.params,
          request.body,
        );
      }),
    );
  }
}
