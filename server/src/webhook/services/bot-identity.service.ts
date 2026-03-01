import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BotRole } from '../types/bot-role';

interface BotIdentityResult {
  role: BotRole;
  tenant?: any;
  driver?: any;
  seller?: any;
  customer?: any;
}

@Injectable()
export class BotIdentityService {
  private readonly logger = new Logger(BotIdentityService.name);

  constructor(private prisma: PrismaService) {}

  private formatPhoneVisual(ddd: string, number: string): string {
    const part1 = number.length === 9 ? number.slice(0, 5) : number.slice(0, 4);
    const part2 = number.length === 9 ? number.slice(5) : number.slice(4);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }

  private buildSearchList(rawPhone: string): string[] {
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (cleanPhone.startsWith('55') && cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(2);
    }

    const ddd = cleanPhone.slice(0, 2);
    const number = cleanPhone.slice(2);

    const possibleNumbers = new Set<string>();
    possibleNumbers.add(cleanPhone);
    possibleNumbers.add(`55${cleanPhone}`);
    possibleNumbers.add(this.formatPhoneVisual(ddd, number));

    if (number.length === 8) {
      const with9 = `9${number}`;
      possibleNumbers.add(with9);
      possibleNumbers.add(`55${ddd}${with9}`);
      possibleNumbers.add(this.formatPhoneVisual(ddd, with9));
    } else if (number.length === 9 && number.startsWith('9')) {
      const without9 = number.slice(1);
      possibleNumbers.add(without9);
      possibleNumbers.add(`55${ddd}${without9}`);
      possibleNumbers.add(this.formatPhoneVisual(ddd, without9));
    }

    return Array.from(possibleNumbers);
  }

  private findRoleInConfig(tenant: any, searchList: string[]): BotRole | null {
    const config = tenant?.config as any;
    const roles = config?.whatsappRoles || {};
    const supervisorPhones: string[] = roles?.supervisorPhones || [];
    const transporterPhones: string[] = roles?.transporterPhones || [];

    if (supervisorPhones.some((phone) => searchList.includes(phone))) {
      return 'SUPERVISOR';
    }

    if (transporterPhones.some((phone) => searchList.includes(phone))) {
      return 'TRANSPORTER';
    }

    return null;
  }

  async identifyActor(rawPhone: string): Promise<BotIdentityResult> {
    const searchList = this.buildSearchList(rawPhone);
    this.logger.log(`🔍 Buscando contato por: ${searchList.join(' | ')}`);

    const driver = await this.prisma.driver.findFirst({
      where: { phone: { in: searchList } },
      include: { vehicles: true, tenant: true },
    });
    if (driver) {
      const driverType = (driver as any).driverType || 'OWN';
      const role =
        driverType && String(driverType).toUpperCase() === 'THIRD_PARTY'
          ? 'THIRD_PARTY_DRIVER'
          : 'DRIVER';
      return { role, driver, tenant: driver.tenant };
    }

    const seller = await this.prisma.seller.findFirst({
      where: { phone: { in: searchList } },
      include: { tenant: true },
    });
    if (seller) {
      return { role: 'SELLER', seller, tenant: seller.tenant };
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ phone: { in: searchList } }, { whatsapp: { in: searchList } }],
      },
      include: { tenant: true, seller: true },
    });
    if (customer) {
      return { role: 'CUSTOMER', customer, tenant: customer.tenant };
    }

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true, config: true },
    });
    for (const tenant of tenants) {
      const role = this.findRoleInConfig(tenant, searchList);
      if (role) {
        return { role, tenant };
      }
    }

    return { role: 'UNKNOWN' };
  }
}
