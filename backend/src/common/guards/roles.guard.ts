import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  CanActivate,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

export const ROLES_KEY = 'roles';
export type Role = 'admin' | 'signer' | 'viewer' | 'guardian' | 'maintainer' | 'contributor';

export const Roles = (...roles: Role[]) => Reflect.createDecorator({ key: ROLES_KEY, transform: () => roles });

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      this.logger.warn('User not authenticated for role-protected endpoint');
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles: Role[] = user.roles || ['viewer'];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `User ${user.sub} attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}. User roles: ${userRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    this.logger.debug(`User ${user.sub} authorized with roles: ${userRoles.join(', ')}`);
    return true;
  }
}