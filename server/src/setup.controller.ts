import { Controller, Post, HttpException, HttpStatus, Headers as RequestHeaders } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { exec } from 'child_process';
import * as bcrypt from 'bcryptjs';

@Controller('setup')
export class SetupController {
  constructor(private readonly prisma: PrismaService) { }

  private checkAuth(headers: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('Endpoint desativado em produção', HttpStatus.FORBIDDEN);
    }
    const adminKey = headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      throw new HttpException('Acesso negado: Chave de administração inválida', HttpStatus.FORBIDDEN);
    }
  }

  @Post('db-push')
  async dbPush(@RequestHeaders() headers: any) {
    this.checkAuth(headers);
    return new Promise((resolve, reject) => {
      // --- MUDANÇA AQUI: Usando --force-reset para limpar o banco conflitante ---
      exec('npx prisma db push --force-reset', (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, stderr });
          return;
        }
        resolve({ success: true, stdout });
      });
    });
  }

  @Post('seed')
  async seed(@RequestHeaders() headers: any) {
    this.checkAuth(headers);
    try {
      console.log('🌱 Iniciando Seed via API...');

      // 1. Criar Tenant
      const tenantId = 'demo-tenant-id';
      const tenant = await (this.prisma as any).tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: {
          id: tenantId,
          name: 'Logística Acme Ltda',
          slug: 'acme-logistica',
          plan: 'ENTERPRISE'
        }
      });

      // 2. Criar Hash da Senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);

      // 3. Criar/Atualizar Admin
      const email = 'admin@zaproute.com';

      // Nota: Como vamos resetar o banco, o 'upsert' vai agir como 'create' na prática
      const user = await (this.prisma as any).user.upsert({
        where: { email },
        update: {
          password: hashedPassword
        },
        create: {
          email,
          password: hashedPassword,
          name: 'Administrador Principal',
          role: 'ADMIN',
          tenantId: tenant.id
        }
      });

      return {
        success: true,
        message: 'Banco resetado e Admin recriado com senha "123456"',
        user: { email: user.email }
      };

    } catch (error: any) {
      console.error('Erro no Seed:', error);
      throw new HttpException(
        `Erro ao inicializar sistema: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
