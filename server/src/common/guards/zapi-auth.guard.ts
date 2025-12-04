import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ZApiAuthGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const clientToken = request.headers['client-token'] || request.query['token'];
        const secureToken = process.env.ZAPI_CLIENT_TOKEN;

        if (!secureToken) {
            console.error('⛔ ZAPI_CLIENT_TOKEN não configurado! Bloqueando acesso por segurança.');
            throw new UnauthorizedException('Configuração de segurança incompleta no servidor.');
        }

        if (clientToken !== secureToken) {
            throw new UnauthorizedException('Token de cliente inválido ou ausente.');
        }

        return true;
    }
}
