import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface RouteProgress {
  id: string;
  name: string;
  percentage: number;
  processed: number;
  total: number;
  driverName: string;
  driverAvatar?: string;
  status: string;
}

interface Occurrence {
  id: string;
  customerName: string;
  address: string;
  driverName: string;
  routeName: string;
  status: string;
  failureReason?: string;
  updatedAt: string;
}

interface DashboardStatsState {
  total: number; // Entregas
  totalRoutes: number; // Rotas
  active: number;
  delivered: number;
  alerts: number;
  activeRouteProgress: RouteProgress[];
  occurrences: Occurrence[];
  weeklyData: { name: string; entregas: number; sucesso: number }[];
  loading: boolean;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStatsState>({
    total: 0,
    totalRoutes: 0,
    active: 0,
    delivered: 0,
    alerts: 0,
    activeRouteProgress: [],
    occurrences: [],
    weeklyData: [],
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const userStr = localStorage.getItem('zaproute_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user?.tenantId) return;

      try {
        const data = await api.routes.getDashboardStats(user.tenantId, 7);
        setStats({
          total: data.stats.totalDeliveries,
          totalRoutes: data.totalRoutes,
          active: data.activeRoutes,
          delivered: data.stats.delivered,
          alerts: data.stats.alerts,
          activeRouteProgress: data.activeRouteProgress || [],
          occurrences: data.occurrences || [],
          weeklyData: data.weeklyData || [],
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao carregar stats', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};
