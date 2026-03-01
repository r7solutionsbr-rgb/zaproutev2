import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;

    const requestedTenantId =
      request?.params?.tenantId ||
      request?.query?.tenantId ||
      request?.body?.tenantId;

    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      throw new ForbiddenException('Acesso negado a outro tenant');
    }

    return true;
  }
}
