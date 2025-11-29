import React, { useMemo, useState } from 'react';
import { Delivery, Route, Driver, DeliveryStatus } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Truck, Map, User, AlertOctagon, FileWarning, ArrowRight, X, Calendar, Clock, Image as ImageIcon } from 'lucide-react';

interface DashboardProps {
  deliveries: Delivery[];
  routes: Route[];
  drivers: Driver[];
}

export const Dashboard: React.FC<DashboardProps> = ({ deliveries, routes, drivers = [] }) => {
  const [selectedOccurrence, setSelectedOccurrence] = useState<Delivery | null>(null);

  // KPI Calculations
  const total = deliveries.length;
  const delivered = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
  const active = deliveries.filter(d => d.status === DeliveryStatus.IN_TRANSIT).length;
  const alerts = deliveries.filter(d => d.status === DeliveryStatus.FAILED || d.status === DeliveryStatus.RETURNED).length;

  // --- LÓGICA DE EVOLUÇÃO DA ROTA ---
  const activeRouteProgress = useMemo(() => {
    const relevantRoutes = routes.filter(r => r.status === 'ACTIVE' || r.status === 'PLANNED' || r.status === 'COMPLETED');

    return relevantRoutes.map(route => {
      const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));
      
      const totalOps = routeDeliveries.length;
      const completedOps = routeDeliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
      const failedOps = routeDeliveries.filter(d => d.status === DeliveryStatus.FAILED || d.status === DeliveryStatus.RETURNED).length;
      
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
          d.status === DeliveryStatus.FAILED || 
          d.status === DeliveryStatus.RETURNED
      ).sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
      });
  }, [deliveries]);

  const getDriverName = (driverId?: string) => {
      if (!driverId) return 'Não identificado';
      return drivers.find(d => d.id === driverId)?.name || 'Desconhecido';
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        
        {/* EVOLUÇÃO DA ROTA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col h-full">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Map className="text-blue-600" size={20} /> Evolução das Rotas
          </h2>
          
          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            {activeRouteProgress.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Map size={48} className="opacity-20 mb-2"/>
                  <p>Nenhuma rota ativa no momento.</p>
               </div>
            ) : (
              activeRouteProgress.map((route) => (
                <div key={route.id} className="group border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {route.name}
                            {route.status === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Em andamento"></span>}
                            {route.status === 'COMPLETED' && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">CONCLUÍDA</span>}
                        </div>
                        
                        <div className="flex gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                            {route.startTime && (
                                <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                    <Clock size={10} className="text-blue-500"/> Início: {route.startTime}
                                </span>
                            )}
                            {route.endTime && (
                                <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                    <Clock size={10} className="text-green-500"/> Fim: {route.endTime}
                                </span>
                            )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                            <User size={12}/> {route.driverName}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`text-2xl font-bold ${route.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'}`}>
                            {route.percentage}%
                        </span>
                    </div>
                  </div>
                  
                  {/* BARRA DE PROGRESSO COM DEGRADÊ */}
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative shadow-inner mt-1">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 ${
                          route.percentage === 100 
                            ? 'bg-green-500' // Sucesso sólido
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600' // Degradê moderno
                      }`}
                      style={{ width: `${route.percentage}%` }}
                    >
                        {/* Efeito de brilho apenas se não estiver 100% */}
                        {route.percentage < 100 && (
                            <div className="w-full h-full absolute top-0 left-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                        )}
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

        {/* LISTA DE OCORRÊNCIAS */}
        <div className="bg-white p-0 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-red-50">
              <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <AlertOctagon className="text-red-600" size={20} /> Ocorrências
              </h2>
              <p className="text-red-600 text-xs mt-1">Entregas com problemas ou devoluções.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {occurrences.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <CheckCircle size={48} className="text-green-200 mb-2"/>
                  <p className="text-sm font-medium text-green-700">Tudo certo!</p>
                  <p className="text-xs">Nenhuma ocorrência registrada.</p>
               </div>
            ) : (
                occurrences.map(item => (
                    <div key={item.id} className="p-3 bg-white border border-red-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === DeliveryStatus.FAILED ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                {item.status === DeliveryStatus.FAILED ? 'Falha' : 'Devolução'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString().slice(0,5) : '--:--'}
                            </span>
                        </div>
                        
                        <h4 className="font-bold text-slate-800 text-sm truncate">{item.customer.tradeName}</h4>
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                            <FileWarning size={14} className="text-red-400 shrink-0" />
                            <span className="truncate italic">
                                "{item.failureReason || 'Motivo não informado'}"
                            </span>
                        </div>

                        <div className="mt-2 flex justify-between items-center text-xs">
                            <span className="font-mono text-slate-400">NF: {item.invoiceNumber}</span>
                            <button 
                                onClick={() => setSelectedOccurrence(item)}
                                className="flex items-center gap-1 text-blue-600 font-bold hover:underline"
                            >
                                Ver <ArrowRight size={10} />
                            </button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL DETALHES */}
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