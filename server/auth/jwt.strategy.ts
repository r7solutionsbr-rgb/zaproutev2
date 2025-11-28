import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SEGREDO_SUPER_SECRETO_DO_MVP', // Nota: Em produção real usaríamos variáveis de ambiente (.env)
    });
  }

  async validate(payload: any) {
    // O que retornarmos aqui será injetado no request.user
    return { userId: payload.sub, email: payload.email, role: payload.role, tenantId: payload.tenantId };
  }
}