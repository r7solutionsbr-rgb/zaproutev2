import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // Valida se o usuário existe e a senha bate
  async validateUser(email: string, pass: string) {
  console.log(`🔍 Tentando login com email: ${email}`); // <--- LOG 1

  const user = await (this.prisma as any).user.findUnique({
    where: { email },
    include: { tenant: true }
  });
  
  if (!user) {
    console.log('❌ Usuário não encontrado no banco.'); // <--- LOG 2
    return null;
  }

  console.log(`✅ Usuário encontrado. Hash no banco: ${user.password.substring(0, 10)}...`); // <--- LOG 3

  const isMatch = await bcrypt.compare(pass, user.password);
  
  if (!isMatch) {
    console.log('❌ Senha não confere.'); // <--- LOG 4
    return null;
  }

  console.log('🚀 Login validado com sucesso!'); // <--- LOG 5
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
}