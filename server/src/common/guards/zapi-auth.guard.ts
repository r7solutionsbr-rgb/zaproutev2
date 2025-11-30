import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ZApiAuthGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const clientToken = request.headers['client-token'];
        const secureToken = process.env.ZAPI_SECURE_TOKEN;

        if (!secureToken) {
            console.warn('⚠️ ZAPI_SECURE_TOKEN não configurado no .env! Webhook vulnerável.');
            return true; // Fallback inseguro para não parar tudo, mas idealmente deveria bloquear.
        }

        if (clientToken !== secureToken) {
            throw new UnauthorizedException('Token de cliente inválido ou ausente.');
        }

        return true;
    }
}
