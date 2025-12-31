import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../../enums/enum';

interface RequestWithUser {
  user?: {
    role: string;
  };
}

// Custom Reflector implementation to avoid import issues
class CustomReflector {
  getAllAndOverride<T>(metadataKey: string, targets: any[]): T | undefined {
    for (const target of targets) {
      const metadata = Reflect.getMetadata(metadataKey, target);
      if (metadata !== undefined) {
        return metadata;
      }
    }
    return undefined;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  private reflector = new CustomReflector();

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user?.role) return false;

    const userRole = user.role;

    if (requiredRoles.includes(UserRole.ADMIN)) {
      return (
        userRole === UserRole.ADMIN ||
        userRole === UserRole.SUPER_ADMIN ||
        requiredRoles.includes(userRole)
      );
    }

    return requiredRoles.includes(userRole);
  }
}
