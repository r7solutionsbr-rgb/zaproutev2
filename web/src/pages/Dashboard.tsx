import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Delivery, Route, Driver } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Map, User, Truck } from 'lucide-react';

interface DashboardProps {
  deliveries: Delivery[];
  routes: Route[];
  drivers: Driver[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC<DashboardProps> = ({ deliveries, routes, drivers = [] }) => {
  // KPI Calculations
  const total = deliveries.length;
  const delivered = deliveries.filter(d => d.status === 'DELIVERED').length;
  const pending = deliveries.filter(d => d.status === 'PENDING').length;
  const active = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
  const alerts = deliveries.filter(d => d.status === 'FAILED' || d.status === 'RETURNED').length;

  const deliveryData = [
    { name: 'Pendente', value: pending },
    { name: 'Em Trânsito', value: active },
    { name: 'Entregue', value: delivered },
    { name: 'Alertas', value: alerts },
  ];

  // --- LÓGICA DE EVOLUÇÃO DA ROTA ---
  const activeRouteProgress = useMemo(() => {
    // Filtra apenas rotas Ativas ou Planejadas (para ver o 0%)
    const relevantRoutes = routes.filter(r => r.status === 'ACTIVE' || r.status === 'PLANNED');

    return relevantRoutes.map(route => {
      // Pega as entregas dessa rota
      const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));
      
      const totalOps = routeDeliveries.length;
      const completedOps = routeDeliveries.filter(d => d.status === 'DELIVERED').length;
      const failedOps = routeDeliveries.filter(d => d.status === 'FAILED' || d.status === 'RETURNED').length;
      
      // Cálculo de porcentagem (Considerando apenas sucesso no progresso visual, ou sucesso+falha como "processado")
      // Geralmente "Evolução" conta o que já foi baixado (Sucesso ou Falha)
      const processed = completedOps + failedOps;
      const percentage = totalOps > 0 ? Math.round((processed / totalOps) * 100) : 0;

      // Dados complementares
      const driver = drivers.find(d => d.id === route.driverId);

      return {
        id: route.id,
        name: route.name,
        percentage,
        processed,
        total: totalOps,
        driverName: driver?.name || 'Sem Motorista',
        driverAvatar: driver?.avatarUrl,
        status: route.status
      };
    }).sort((a, b) => b.percentage - a.percentage); // Ordena pelos mais adiantados
  }, [routes, deliveries, drivers]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Painel de Operações</h1>
        <p className="text-slate-500">Acompanhamento em tempo real da execução das rotas.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Total de Entregas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-green-600 font-medium mt-2">Volume do dia</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Rotas em Andamento</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Truck size={20} /></div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{routes.filter(r => r.status === 'ACTIVE').length}</span>
          <span className="text-xs text-slate-500 mt-2">de {routes.length} planejadas</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Taxa de Sucesso</span>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{total > 0 ? Math.round((delivered / total) * 100) : 0}%</span>
          <span className="text-xs text-slate-500 mt-2">Meta: 95%</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Alertas</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={20} /></div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{alerts}</span>
          <span className="text-xs text-red-600 font-medium mt-2">Falhas / Devoluções</span>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- NOVO CARD: EVOLUÇÃO DA ROTA --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Map className="text-blue-600" size={20} /> Evolução das Rotas
          </h2>
          
          <div className="flex-1 space-y-6 overflow-y-auto max-h-[400px] pr-2">
            {activeRouteProgress.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                  <Map size={48} className="opacity-20 mb-2"/>
                  <p>Nenhuma rota ativa no momento.</p>
               </div>
            ) : (
              activeRouteProgress.map((route) => (
                <div key={route.id} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {route.name}
                            {route.status === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <User size={12}/> {route.driverName}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-blue-600">{route.percentage}%</span>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 ${
                          route.percentage === 100 ? 'bg-green-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${route.percentage}%` }}
                    >
                        {/* Efeito de brilho/movimento na barra */}
                        <div className="w-full h-full absolute top-0 left-0 bg-white/10" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-1 text-[10px] font-medium text-slate-400">
                      <span>0%</span>
                      <span>{route.processed} de {route.total} entregas</span>
                      <span>100%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gráfico de Status (Pie Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Status Geral</h2>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deliveryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-2">
            {deliveryData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};