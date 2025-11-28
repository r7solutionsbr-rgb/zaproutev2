import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Delivery, Route } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DashboardProps {
  deliveries: Delivery[];
  routes: Route[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC<DashboardProps> = ({ deliveries, routes }) => {
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

  const performanceData = [
    { name: 'Seg', entregues: 400, falhas: 24 },
    { name: 'Ter', entregues: 300, falhas: 13 },
    { name: 'Qua', entregues: 520, falhas: 38 },
    { name: 'Qui', entregues: 450, falhas: 20 },
    { name: 'Sex', entregues: 480, falhas: 30 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Painel de Operações</h1>
        <p className="text-slate-500">Visão geral em tempo real da performance da frota e status das entregas.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Total de Entregas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-green-600 font-medium mt-2">+12% em relação a ontem</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Rotas Ativas</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock size={20} /></div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{routes.filter(r => r.status === 'ACTIVE').length}</span>
          <span className="text-xs text-slate-500 mt-2">{routes.length} planejadas total</span>
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
            <span className="text-slate-500 text-sm font-medium">Ocorrências</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={20} /></div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{alerts}</span>
          <span className="text-xs text-red-600 font-medium mt-2">Requer atenção</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Volume Semanal</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="entregues" name="Entregues" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="falhas" name="Falhas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Status de Hoje</h2>
          <div className="h-72 w-full flex items-center justify-center">
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
          <div className="grid grid-cols-2 gap-4 mt-4">
            {deliveryData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                <span className="text-sm text-slate-600">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};