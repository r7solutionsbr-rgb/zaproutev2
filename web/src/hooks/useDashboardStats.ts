import { useMemo } from 'react';
import { Delivery, Route, Driver } from '../types';

interface UseDashboardStatsProps {
    deliveries: Delivery[];
    routes: Route[];
    drivers: Driver[];
}

export const useDashboardStats = ({ deliveries, routes, drivers }: UseDashboardStatsProps) => {
    // KPI Calculations
    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'DELIVERED').length;
    const active = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
    const alerts = deliveries.filter(d => d.status === 'FAILED' || d.status === 'RETURNED').length;

    // --- LÓGICA DE EVOLUÇÃO DA ROTA ---
    const activeRouteProgress = useMemo(() => {
        const relevantRoutes = routes.filter(r => r.status === 'ACTIVE' || r.status === 'PLANNED' || r.status === 'COMPLETED');

        return relevantRoutes.map(route => {
            const routeDeliveries = deliveries.filter(d => route.deliveries.some(rd => rd.id === d.id));

            const totalOps = routeDeliveries.length;
            const completedOps = routeDeliveries.filter(d => d.status === 'DELIVERED').length;
            const failedOps = routeDeliveries.filter(d => d.status === 'FAILED' || d.status === 'RETURNED').length;

            const processed = completedOps + failedOps;
            const percentage = totalOps > 0 ? Math.round((processed / totalOps) * 100) : 0;

            const driver = drivers.find(d => d.id === route.driverId);

            return {
                id: route.id,
                name: route.name,
                percentage,
                processed,
                total: totalOps,
                driverName: driver?.name || 'Sem Motorista',
                driverAvatar: driver?.avatarUrl,
                status: route.status,
                startTime: route.startTime,
                endTime: route.endTime
            };
        }).sort((a, b) => {
            // 1. Critério: Rotas FINALIZADAS vão para o final da lista
            if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
            if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;

            // 2. Critério: Rotas com maior progresso aparecem primeiro (entre as ativas)
            return b.percentage - a.percentage;
        });
    }, [routes, deliveries, drivers]);

    // --- LÓGICA DE OCORRÊNCIAS ---
    const occurrences = useMemo(() => {
        return deliveries.filter(d =>
            d.status === 'FAILED' ||
            d.status === 'RETURNED'
        ).sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [deliveries]);

    return {
        total,
        delivered,
        active,
        alerts,
        activeRouteProgress,
        occurrences
    };
};
