import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JourneyEventType } from '@prisma/client';

@Injectable()
export class JourneyService {
    constructor(private prisma: PrismaService) { }

    async createEvent(
        tenantId: string,
        driverId: string,
        data: {
            type: JourneyEventType;
            latitude?: number;
            longitude?: number;
            locationAddress?: string;
            notes?: string;
        },
    ) {
        // 1. Validate Driver existence and ownership
        const driver = await this.prisma.driver.findFirst({
            where: { id: driverId, tenantId },
        });

        if (!driver) {
            throw new BadRequestException('Motorista não encontrado.');
        }

        // 2. Validate State Transitions (Basic Rules)
        const currentStatus = driver.currentJourneyStatus;
        const newType = data.type;

        // Rule: Cannot start journey if already in one (unless it was ended)
        if (newType === 'JOURNEY_START' && currentStatus && currentStatus !== 'JOURNEY_END') {
            throw new BadRequestException('Motorista já está em jornada.');
        }

        // Rule: Cannot start meal/rest/wait if not in journey
        if (['MEAL_START', 'WAIT_START', 'REST_START'].includes(newType)) {
            if (!currentStatus || currentStatus === 'JOURNEY_END') {
                throw new BadRequestException('É necessário iniciar a jornada antes de registrar pausas.');
            }
            // Cannot start a break if already in another break
            if (['MEAL_START', 'WAIT_START', 'REST_START'].includes(currentStatus)) {
                throw new BadRequestException('Você já está em uma pausa. Encerre-a primeiro.');
            }
        }

        // Rule: Cannot end meal/rest/wait if not in that specific break
        if (newType === 'MEAL_END' && currentStatus !== 'MEAL_START') throw new BadRequestException('Não há intervalo de refeição aberto para encerrar.');
        if (newType === 'WAIT_END' && currentStatus !== 'WAIT_START') throw new BadRequestException('Não há tempo de espera aberto para encerrar.');
        if (newType === 'REST_END' && currentStatus !== 'REST_START') throw new BadRequestException('Não há descanso aberto para encerrar.');

        // Rule: Cannot end journey if in a break (must end break first)
        if (newType === 'JOURNEY_END' && ['MEAL_START', 'WAIT_START', 'REST_START'].includes(currentStatus)) {
            throw new BadRequestException('Encerre a pausa atual antes de finalizar a jornada.');
        }

        // 3. Create Event
        const event = await this.prisma.driverJourneyEvent.create({
            data: {
                tenantId,
                driverId,
                type: newType,
                latitude: data.latitude,
                longitude: data.longitude,
                locationAddress: data.locationAddress,
                notes: data.notes,
            },
        });

        // 4. Update Driver Status
        // If ending a break, status goes back to JOURNEY_START (or just "ON_JOURNEY" concept, but we use the enum)
        // Actually, if I end a meal, I am back to "working" (driving or available). 
        // Let's map the status:
        // MEAL_END -> JOURNEY_START (meaning "Active in Journey")
        // WAIT_END -> JOURNEY_START
        // REST_END -> JOURNEY_START

        let nextStatus = newType;
        if (['MEAL_END', 'WAIT_END', 'REST_END'].includes(newType)) {
            nextStatus = 'JOURNEY_START';
        }

        await this.prisma.driver.update({
            where: { id: driverId },
            data: {
                currentJourneyStatus: nextStatus,
                lastJourneyEvent: event.timestamp,
                // Optional: Sync with the main 'status' field of the driver (ON_ROUTE, IDLE, OFFLINE)
                // If JOURNEY_START -> IDLE (or ON_ROUTE if they have a route)
                // If JOURNEY_END -> OFFLINE
                status: newType === 'JOURNEY_END' ? 'OFFLINE' : 'IDLE' // Simplification
            },
        });

        return event;
    }

    async getHistory(tenantId: string, driverId: string, date?: string) {
        const whereClause: any = { tenantId, driverId };

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            whereClause.timestamp = {
                gte: start,
                lte: end
            };
        }

        return this.prisma.driverJourneyEvent.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
        });
    }
}
