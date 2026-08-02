import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { AuthUserCacheService } from '../auth-user-cache.service';
import { RoleAssignmentService } from '../role-assignment.service';

type JwtPayload = {
  sub: string;
  phone?: string | null;
  email?: string | null;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly roleAssignment: RoleAssignmentService,
    private readonly authUserCache: AuthUserCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      this.authUserCache.invalidate(payload.sub);
      throw new UnauthorizedException('Account is inactive or not found');
    }

    const cached = this.authUserCache.get(payload.sub);
    if (cached) {
      return cached;
    }

    const role = await this.roleAssignment.syncRoleForLoadedUser(user);

    const authUser: AuthUser = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role,
    };

    this.authUserCache.set(payload.sub, authUser);

    return authUser;
  }
}
