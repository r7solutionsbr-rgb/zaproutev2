import React, { useState, useMemo } from 'react';
import { Delivery } from '../types';
import {
  TrendingUp, AlertTriangle, CheckCircle, Truck, Map, User, AlertOctagon,
  FileWarning, ArrowRight, X, Clock, Image as ImageIcon, Calendar, BarChart3
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

import { useData } from '../contexts/DataContext';
import { useDashboardStats } from '../hooks/useDashboardStats';

export const Dashboard: React.FC = () => {
  const { deliveries, routes, drivers } = useData();
  const [selectedOccurrence, setSelectedOccurrence] = useState<Delivery | null>(null);

  const { total, delivered, active, alerts, activeRouteProgress, occurrences } = useDashboardStats({ deliveries, routes, drivers });

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Não identificado';
    return drivers.find(d => d.id === driverId)?.name || 'Desconhecido';
  };

  // --- MOCK DATA FOR CHARTS ---
  const weeklyData = [
    { name: 'Seg', entregas: 45, sucesso: 40 },
    { name: 'Ter', entregas: 52, sucesso: 48 },
    { name: 'Qua', entregas: 48, sucesso: 45 },
    { name: 'Qui', entregas: 60, sucesso: 55 },
    { name: 'Sex', entregas: total > 0 ? total : 55, sucesso: delivered > 0 ? delivered : 50 }, // Use real data for today if available
    { name: 'Sáb', entregas: 30, sucesso: 28 },
    { name: 'Dom', entregas: 15, sucesso: 15 },
  ];

  const statusData = [
    { name: 'Entregue', value: delivered, color: '#22c55e' }, // green-500
    { name: 'Pendente', value: active, color: '#3b82f6' }, // blue-500
    { name: 'Falha', value: alerts, color: '#ef4444' }, // red-500
  ].filter(item => item.value > 0);

  // --- GREETING ---
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{greeting}, Gestor!</h1>
          <p className="text-slate-500 mt-1">Aqui está o panorama operacional de hoje.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600">
          <Calendar size={16} className="text-blue-600" />
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12% vs ontem</span>
          </div>
          <span className="text-slate-500 text-sm font-medium block mb-1">Total de Entregas</span>
          <span className="text-4xl font-bold text-slate-900">{total}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Truck size={24} />
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
              {routes.length} rotas
            </span>
          </div>
          <span className="text-slate-500 text-sm font-medium block mb-1">Em Andamento</span>
          <span className="text-4xl font-bold text-slate-900">{routes.filter(r => r.status === 'ACTIVE').length}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle size={24} />
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">Meta: 95%</span>
          </div>
          <span className="text-slate-500 text-sm font-medium block mb-1">Taxa de Sucesso</span>
          <span className="text-4xl font-bold text-slate-900">
            {total > 0 ? Math.round((delivered / total) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
            {alerts > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full animate-pulse">
                Atenção
              </span>
            )}
          </div>
          <span className="text-slate-500 text-sm font-medium block mb-1">Ocorrências</span>
          <span className="text-4xl font-bold text-slate-900">{alerts}</span>
        </div>
      </div>

      {/* ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={20} /> Tendência Semanal
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="entregas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEntregas)" />
                <Area type="monotone" dataKey="sucesso" stroke="#22c55e" strokeWidth={3} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} /> Status Hoje
          </h2>
          <div className="flex-1 min-h-[250px] relative">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                Sem dados suficientes
              </div>
            )}
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-bold text-slate-800">{total}</span>
              <span className="text-xs text-slate-500 uppercase font-bold">Total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* EVOLUÇÃO DA ROTA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Map className="text-indigo-600" size={20} /> Evolução das Rotas
            </h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {activeRouteProgress.length} ativas
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {activeRouteProgress.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Map size={48} className="opacity-20 mb-2" />
                <p>Nenhuma rota ativa no momento.</p>
              </div>
            ) : (
              activeRouteProgress.map((route) => (
                <div key={route.id} className="group p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {route.name}
                          {route.status === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Em andamento"></span>}
                        </div>
                        <div className="text-xs text-slate-500">{route.driverName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${route.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'}`}>
                        {route.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* BARRA DE PROGRESSO */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${route.percentage === 100 ? 'bg-green-500' : 'bg-blue-600'
                        }`}
                      style={{ width: `${route.percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={10} /> {route.startTime || '--:--'}</span>
                    <span>{route.processed} / {route.total} entregas</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LISTA DE OCORRÊNCIAS */}
        <div className="bg-white p-0 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-red-50/50">
            <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <AlertOctagon className="text-red-600" size={20} /> Ocorrências
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {occurrences.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <CheckCircle size={48} className="text-green-200 mb-2" />
                <p className="text-sm font-medium text-green-700">Operação fluindo!</p>
                <p className="text-xs">Sem problemas reportados.</p>
              </div>
            ) : (
              occurrences.map(item => (
                <div key={item.id} className="p-3 bg-white border border-red-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.status === 'FAILED' ? 'Falha' : 'Devolução'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString().slice(0, 5) : '--:--'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm truncate mt-1">{item.customer.tradeName}</h4>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <FileWarning size={14} className="text-red-400 shrink-0" />
                    <span className="truncate italic">
                      "{item.failureReason || 'Motivo não informado'}"
                    </span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => setSelectedOccurrence(item)}
                      className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline"
                    >
                      Ver Detalhes <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL DETALHES (Mantido igual, apenas melhoria visual) */}
      {selectedOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-full">
                  <AlertOctagon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Detalhe da Ocorrência</h3>
                  <p className="text-xs text-red-700">NF: {selectedOccurrence.invoiceNumber}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOccurrence(null)} className="text-red-400 hover:text-red-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Cliente</label>
                <p className="font-bold text-slate-800 text-lg">{selectedOccurrence.customer.tradeName}</p>
                <p className="text-sm text-slate-500">{selectedOccurrence.customer.addressDetails?.street}, {selectedOccurrence.customer.addressDetails?.number}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-1">
                  <FileWarning size={14} /> Motivo Reportado
                </label>
                <p className="text-red-600 font-medium italic">
                  "{selectedOccurrence.failureReason || 'Sem descrição'}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                    <User size={12} /> Motorista
                  </label>
                  <p className="font-medium text-slate-700 text-sm">
                    {getDriverName(selectedOccurrence.driverId)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Clock size={12} /> Horário
                  </label>
                  <p className="font-medium text-slate-700 text-sm">
                    {selectedOccurrence.updatedAt ? new Date(selectedOccurrence.updatedAt).toLocaleString() : '-'}
                  </p>
                </div>
              </div>

              {selectedOccurrence.proofOfDelivery ? (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                    <ImageIcon size={14} /> Evidência / Foto
                  </label>
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img
                      src={selectedOccurrence.proofOfDelivery}
                      alt="Comprovante"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 text-sm">
                  Sem foto anexada.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOccurrence(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};