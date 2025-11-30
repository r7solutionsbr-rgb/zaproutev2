import React, { useState } from 'react';
import { Route, Delivery, Driver, DeliveryStatus, Vehicle } from '../types';
import { Waypoints, Truck, User, Package, Clock, AlertCircle, DollarSign, ArrowLeft, MapPin, FileText } from 'lucide-react';

import { useData } from '../contexts/DataContext';

export const RouteList: React.FC = () => {
  const { routes, deliveries, drivers, vehicles } = useData();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const getRouteStats = (route: Route) => {
    const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));

    const totalVolume = routeDeliveries.reduce((acc, d) => acc + Number(d.volume || 0), 0);
    const totalValue = routeDeliveries.reduce((acc, d) => acc + Number(d.value || 0), 0);

    const pendingCount = routeDeliveries.filter(d => d.status !== DeliveryStatus.DELIVERED && d.status !== DeliveryStatus.FAILED && d.status !== DeliveryStatus.RETURNED).length;

    const driver = drivers.find(d => d.id === route.driverId);
    const vehicle = vehicles.find(v => v.id === route.vehicleId);

    return {
      totalDeliveries: routeDeliveries.length,
      pendingCount,
      totalVolume,
      totalValue,
      driverName: driver ? driver.name : 'Não atribuído',
      driverAvatar: driver?.avatarUrl, // <--- NOVO: URL da foto
      vehiclePlate: vehicle ? vehicle.plate : 'Sem veículo'
    };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // --- VIEW: DETAIL (Selected Route) ---
  if (selectedRouteId) {
    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return <div>Rota não encontrada</div>;

    const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));
    const stats = getRouteStats(route);

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <button
          onClick={() => setSelectedRouteId(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Voltar para Lista de Rotas
        </button>

        {/* Route Header Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {route.name}
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                  {route.id}
                </span>
              </h1>
              <div className="flex gap-4 mt-2 text-sm text-slate-600 items-center">
                {/* MOTORISTA NO DETALHE */}
                <div className="flex items-center gap-1">
                  {stats.driverAvatar ? (
                    <img src={stats.driverAvatar} alt="" className="w-5 h-5 rounded-full object-cover border border-slate-300" />
                  ) : (
                    <User size={14} />
                  )}
                  {stats.driverName}
                </div>
                <span className="flex items-center gap-1"><Truck size={14} /> {stats.vehiclePlate}</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {route.startTime || '--:--'} - {route.endTime || '--:--'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${route.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                  route.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-500'
                }`}>
                {route.status === 'ACTIVE' ? 'EM ROTA' :
                  route.status === 'COMPLETED' ? 'FINALIZADA' : 'PLANEJADA'}
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-800">{formatCurrency(stats.totalValue)}</div>
              <div className="text-xs text-slate-500">Valor Total da Carga</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t pt-4">
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">Entregas</span>
              <span className="text-lg font-semibold">{stats.totalDeliveries}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">Pendentes</span>
              <span className="text-lg font-semibold text-orange-600">{stats.pendingCount}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">Volume</span>
              <span className="text-lg font-semibold">{stats.totalVolume.toFixed(2)} m³</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">Progresso</span>
              <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${stats.totalDeliveries > 0 ? ((stats.totalDeliveries - stats.pendingCount) / stats.totalDeliveries) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-700">
            <Package size={18} /> Manifesto de Carga
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-4 w-16">#</th>
                  <th className="p-4">Nota Fiscal</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Endereço</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routeDeliveries.map((delivery, index) => (
                  <tr key={delivery.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-slate-400">{index + 1}</td>
                    <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" /> {delivery.invoiceNumber}
                    </td>
                    <td className="p-4 font-medium">{delivery.customer.tradeName}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate" title={delivery.customer.location.address}>
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="shrink-0" /> {delivery.customer.location.address}
                      </div>
                    </td>
                    <td className="p-4 text-right">{formatCurrency(Number(delivery.value || 0))}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                          delivery.status === 'PENDING' ? 'bg-slate-100 text-slate-500' :
                            delivery.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                        }`}>
                        {delivery.status === 'DELIVERED' ? 'ENTREGUE' :
                          delivery.status === 'PENDING' ? 'PENDENTE' :
                            delivery.status === 'IN_TRANSIT' ? 'EM ROTA' : 'FALHA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST (All Routes) ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Waypoints className="text-blue-600" /> Listagem de Rotas
          </h1>
          <p className="text-slate-500 mt-1">Visão geral analítica das rotas processadas.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Nome da Rota</th>
                <th className="p-4">Motorista</th>
                <th className="p-4">Veículo</th>
                <th className="p-4 text-center">Qtd. Entregas</th>
                <th className="p-4 text-center">Pendentes</th>
                <th className="p-4 text-right">Volume (m³)</th>
                <th className="p-4 text-right">Valor Total</th>
                <th className="p-4">Início / Fim</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((route) => {
                const stats = getRouteStats(route);

                return (
                  <tr key={route.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedRouteId(route.id)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        {route.name}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* FOTO DO MOTORISTA NA LISTAGEM */}
                        {stats.driverAvatar ? (
                          <img
                            src={stats.driverAvatar}
                            alt={stats.driverName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                            <User size={16} />
                          </div>
                        )}
                        <span className="font-medium text-slate-700">{stats.driverName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Truck size={16} className="text-slate-400" />
                        {stats.vehiclePlate}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {stats.totalDeliveries}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {stats.pendingCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {stats.pendingCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Concluído
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {stats.totalVolume.toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-medium text-slate-800">
                      {formatCurrency(stats.totalValue)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={12} className="text-green-500" /> {route.startTime || '--:--'}</span>
                        <span className="flex items-center gap-1"><Clock size={12} className="text-red-500" /> {route.endTime || '--:--'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${route.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                          route.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                        {route.status === 'ACTIVE' ? 'EM ROTA' :
                          route.status === 'COMPLETED' ? 'FINALIZADA' : 'PLANEJADA'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {routes.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <AlertCircle size={32} className="mb-2 opacity-20" />
                      <p>Nenhuma rota cadastrada.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};