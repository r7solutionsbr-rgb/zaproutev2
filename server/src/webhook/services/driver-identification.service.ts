
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DriverIdentificationService {
    private readonly logger = new Logger(DriverIdentificationService.name);

    constructor(private prisma: PrismaService) { }

    private formatPhoneVisual(ddd: string, number: string): string {
        const part1 = number.length === 9 ? number.slice(0, 5) : number.slice(0, 4);
        const part2 = number.length === 9 ? number.slice(5) : number.slice(4);
        return `+55 (${ddd}) ${part1}-${part2}`;
    }

    async identifyDriver(rawPhone: string) {
        // 1. Limpeza total (apenas números)
        let cleanPhone = rawPhone.replace(/\D/g, '');

        // 2. Remove código do país (55) se existir
        if (cleanPhone.startsWith('55') && cleanPhone.length > 10) {
            cleanPhone = cleanPhone.slice(2);
        }

        const ddd = cleanPhone.slice(0, 2);
        const number = cleanPhone.slice(2);

        // 3. Gera lista de possibilidades
        const possibleNumbers = new Set<string>();

        // Variação A: Apenas dígitos
        possibleNumbers.add(cleanPhone);
        possibleNumbers.add(`55${cleanPhone}`);

        // Variação B: Formatado visualmente
        possibleNumbers.add(this.formatPhoneVisual(ddd, number));

        // Variação C: Nono Dígito
        if (number.length === 8) {
            const with9 = '9' + number;
            possibleNumbers.add(with9);
            possibleNumbers.add(`55${ddd}${with9}`);
            possibleNumbers.add(this.formatPhoneVisual(ddd, with9));
        } else if (number.length === 9 && number.startsWith('9')) {
            const without9 = number.slice(1);
            possibleNumbers.add(without9);
            possibleNumbers.add(`55${ddd}${without9}`);
            possibleNumbers.add(this.formatPhoneVisual(ddd, without9));
        }

        const searchList = Array.from(possibleNumbers);
        this.logger.log(`🔍 Buscando motorista por: ${searchList.join(' | ')}`);

        // 4. Consulta ao Banco
        const driver = await this.prisma.driver.findFirst({
            where: { phone: { in: searchList } },
            include: { vehicle: true, tenant: true }
        });

        return driver;
    }
}
