import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { v4 as uuidv4 } from 'uuid'; 

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService // <--- Injeção do serviço de e-mail
  ) {}

  // --- LOGIN ---

  // Valida se o usuário existe e a senha bate
  async validateUser(email: string, pass: string) {
    const user = await (this.prisma as any).user.findUnique({
      where: { email },
      include: { tenant: true }
    });
    
    if (!user || !user.password) return null;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    const { password, ...result } = user;
    return result;
  }

  // Gera o Token JWT
  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role, 
      tenantId: user.tenantId 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name
      }
    };
  }

  // --- RECUPERAÇÃO DE SENHA ---

  async forgotPassword(email: string) {
    const user = await (this.prisma as any).user.findUnique({ where: { email } });
    
    // Segurança: Retornamos sucesso mesmo se o e-mail não existir para não revelar usuários
    if (!user) return { message: 'Se o e-mail existir, as instruções foram enviadas.' };

    // Gera token e expiração (1 hora)
    const token = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); 

    // Salva no banco
    await (this.prisma as any).user.update({
        where: { id: user.id },
        data: {
            resetToken: token,
            resetTokenExpires: expires
        }
    });

    // Envia e-mail (Sem await para não travar a resposta da API)
    this.mailService.sendForgotPassEmail(user.email, token).catch((err: any) => {
        console.error('Erro ao enviar e-mail de recuperação:', err);
    });

    return { message: 'Se o e-mail existir, as instruções foram enviadas.' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Busca usuário com token válido e que ainda não expirou
    const user = await (this.prisma as any).user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpires: { gt: new Date() } // gt = greater than (maior que agora)
        }
    });

    if (!user) {
        throw new BadRequestException('Token inválido ou expirado.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualiza senha e limpa o token
    await (this.prisma as any).user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpires: null
        }
    });

    return { message: 'Senha alterada com sucesso! Faça login com a nova senha.' };
  }
}