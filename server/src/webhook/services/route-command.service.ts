import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class RouteCommandService {
    private readonly logger = new Logger(RouteCommandService.name);

    constructor(private prisma: PrismaService) { }

    async handleStartRoute(driverId: string, routeId: string) {
        await this.prisma.route.update({
            where: { id: routeId },
            data: { status: 'ACTIVE', startTime: new Date().toLocaleTimeString('pt-BR') }
        });

        await this.prisma.delivery.updateMany({
            where: { routeId: routeId, status: 'PENDING' },
            data: { status: 'IN_TRANSIT' }
        });

        return { status: 'route_started' };
    }

    async handleExitRoute(routeId: string) {
        await this.prisma.route.update({
            where: { id: routeId },
            data: { status: 'PLANNED', startTime: null }
        });

        await this.prisma.delivery.updateMany({
            where: { routeId: routeId, status: 'IN_TRANSIT' },
            data: { status: 'PENDING' }
        });

        return { status: 'route_exited' };
    }

    async handleDeliveryUpdate(deliveryId: string, status: 'DELIVERED' | 'FAILED', reason?: string, proofUrl?: string) {
        const updateResult = await this.prisma.delivery.updateMany({
            where: {
                id: deliveryId,
                status: { in: ['PENDING', 'IN_TRANSIT'] }
            },
            data: {
                status,
                failureReason: reason,
                proofOfDelivery: proofUrl,
                updatedAt: new Date()
            }
        });

        return updateResult.count > 0;
    }

    async handleWorkflowStep(deliveryId: string, step: 'CHEGADA' | 'INICIO_DESCARGA' | 'FIM_DESCARGA') {
        const updateData: any = {};
        const now = new Date();

        if (step === 'CHEGADA') updateData.arrivedAt = now;
        else if (step === 'INICIO_DESCARGA') updateData.unloadingStartedAt = now;
        else if (step === 'FIM_DESCARGA') updateData.unloadingEndedAt = now;

        await this.prisma.delivery.update({
            where: { id: deliveryId },
            data: updateData
        });

        return { status: 'workflow_step_updated', step };
    }

    async handleFinishRoute(routeId: string) {
        await this.prisma.route.update({
            where: { id: routeId },
            data: { status: 'COMPLETED', endTime: new Date().toLocaleTimeString('pt-BR') }
        });
        return { status: 'route_completed' };
    }
}
