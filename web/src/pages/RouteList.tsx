import React, { useState, useEffect } from 'react';
import { Route, Delivery, DeliveryStatus } from '../types';
import {
  Waypoints, Truck, User, Package, Clock, ArrowLeft, MapPin, FileText,
  Map as MapIcon, Camera, Copy, MoreVertical, CheckSquare, AlertTriangle,
  Search, Filter, ChevronRight
} from 'lucide-react';

import { useData } from '../contexts/DataContext';
import { api } from '../services/api';

// Imported Components
import { ImageModal } from '../components/ImageModal';
import { ForceDeliveryModal } from '../components/ForceDeliveryModal';
import { RouteMapModal } from '../components/RouteMapModal';

export const RouteList: React.FC = () => {
  const { routes, deliveries, drivers, vehicles, refreshData } = useData();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // --- TENANT CONFIG ---
  const [tenantConfig, setTenantConfig] = useState<any>({});

  useEffect(() => {
    api.tenants.getMe().then(t => setTenantConfig(t.config || {}));
  }, []);

  const showFinancials = tenantConfig.displaySettings?.showFinancials ?? true;
  const showVolume = tenantConfig.displaySettings?.showVolume ?? true;
  const volumeLabel = tenantConfig.displaySettings?.volumeLabel || 'Volume';

  // States for Modals
  const [viewMapRoute, setViewMapRoute] = useState<Route | null>(null);
  const [focusedDeliveryId, setFocusedDeliveryId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string, title: string } | null>(null);

  // Force Delivery State
  const [deliveryToUpdate, setDeliveryToUpdate] = useState<Delivery | null>(null);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PLANNED' | 'ALL'>('ACTIVE');
  const [searchText, setSearchText] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const handleForceDelivery = async (status: DeliveryStatus, reason?: string) => {
    if (!deliveryToUpdate) return;

    setIsUpdateLoading(true);
    try {
      await api.routes.updateDeliveryStatus(deliveryToUpdate.id, status, undefined, reason);
      await refreshData();
      setDeliveryToUpdate(null);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status. Tente novamente.");
    } finally {
      setIsUpdateLoading(false);
    }
  };

  const getRouteStats = (route: Route) => {
    const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));

    const totalVolume = routeDeliveries.reduce((acc, d) => acc + Number(d.volume || 0), 0);
    const totalValue = routeDeliveries.reduce((acc, d) => acc + Number(d.value || 0), 0);

    const pendingCount = routeDeliveries.filter(d => d.status === 'PENDING' || d.status === 'IN_TRANSIT').length;
    const deliveredCount = routeDeliveries.filter(d => d.status === 'DELIVERED').length;
    const failedCount = routeDeliveries.filter(d => d.status === 'FAILED' || d.status === 'RETURNED').length;

    const total = routeDeliveries.length;
    const successPct = total > 0 ? (deliveredCount / total) * 100 : 0;
    const failedPct = total > 0 ? (failedCount / total) * 100 : 0;

    const driver = drivers.find(d => d.id === route.driverId);
    const vehicle = vehicles.find(v => v.id === route.vehicleId);

    return {
      totalDeliveries: total,
      pendingCount,
      deliveredCount,
      failedCount,
      successPct,
      failedPct,
      totalVolume,
      totalValue,
      driverName: driver ? driver.name : 'Não atribuído',
      driverAvatar: driver?.avatarUrl,
      vehiclePlate: vehicle ? vehicle.plate : 'Sem veículo'
    };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // --- FILTER LOGIC ---
  const filteredRoutes = routes.filter(route => {
    // 1. Tab Filter
    if (activeTab !== 'ALL' && route.status !== activeTab) return false;

    // 2. Search Text (Name)
    if (searchText && !route.name.toLowerCase().includes(searchText.toLowerCase())) return false;

    // 3. Driver Filter
    if (driverFilter !== 'ALL' && route.driverId !== driverFilter) return false;

    // 4. Vehicle Filter
    if (vehicleFilter !== 'ALL' && route.vehicleId !== vehicleFilter) return false;

    return true;
  });

  // --- VIEW: DETAIL (Selected Route) ---
  if (selectedRouteId) {
    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return <div>Rota não encontrada</div>;

    const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));
    const stats = getRouteStats(route);

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto relative" onClick={() => setActionMenuOpen(null)}>
        {/* MODALS */}
        {selectedImage && (
          <ImageModal
            imageUrl={selectedImage.url}
            title={selectedImage.title}
            onClose={() => setSelectedImage(null)}
          />
        )}
        {deliveryToUpdate && (
          <ForceDeliveryModal
            delivery={deliveryToUpdate}
            onConfirm={handleForceDelivery}
            onClose={() => setDeliveryToUpdate(null)}
            isLoading={isUpdateLoading}
          />
        )}
        {viewMapRoute && (
          <RouteMapModal
            route={viewMapRoute}
            deliveries={deliveries}
            onClose={() => {
              setViewMapRoute(null);
              setFocusedDeliveryId(null);
            }}
            focusDeliveryId={focusedDeliveryId}
          />
        )}

        <button
          onClick={() => setSelectedRouteId(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>

        {/* Route Header Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex flex-wrap items-center gap-2">
                {route.name}
                <span className="text-sm font-mono font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 flex items-center gap-2">
                  #{route.id.substring(0, 8)}...
                  <button
                    onClick={() => navigator.clipboard.writeText(route.id)}
                    className="hover:text-blue-600 transition-colors"
                    title="Copiar ID"
                  >
                    <Copy size={12} />
                  </button>
                </span>
              </h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 items-center">
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
            <div className="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-start items-center md:items-end">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${route.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                route.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                {route.status === 'ACTIVE' ? 'EM ROTA' :
                  route.status === 'COMPLETED' ? 'FINALIZADA' : 'PLANEJADA'}
              </span>
              {showFinancials && (
                <div className="md:mt-2">
                  <div className="text-xl md:text-2xl font-bold text-slate-800">{formatCurrency(stats.totalValue)}</div>
                  <div className="text-xs text-slate-500 text-right hidden md:block">Valor Total</div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">Entregas</span>
              <span className="text-lg font-semibold">{stats.totalDeliveries}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">Pendentes</span>
              <span className="text-lg font-semibold text-orange-600">{stats.pendingCount}</span>
            </div>
            {showVolume && (
              <div>
                <span className="block text-xs text-slate-400 uppercase font-bold">{volumeLabel}</span>
                <span className="text-lg font-semibold">{stats.totalVolume.toFixed(2)}</span>
              </div>
            )}
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">Progresso</span>
              <div className="w-full bg-slate-100 rounded-full h-3 mt-2 flex overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: `${stats.successPct}%` }} title="Entregues"></div>
                <div className="bg-red-500 h-full" style={{ width: `${stats.failedPct}%` }} title="Falhas"></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{stats.deliveredCount} entregues</span>
                {stats.failedCount > 0 && <span className="text-red-500 font-bold">{stats.failedCount} falhas</span>}
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
                  <th className="p-4 w-16 text-center">#</th>
                  <th className="p-4">Cliente / NF</th>
                  <th className="p-4 hidden md:table-cell">Endereço</th>
                  <th className="p-4">Horário</th>
                  {showFinancials && <th className="p-4 text-right hidden md:table-cell">Valor</th>}
                  <th className="p-4 text-center">Evidência</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routeDeliveries.map((delivery, index) => {
                  const isDelivered = delivery.status === 'DELIVERED';
                  const isFailed = delivery.status === 'FAILED' || delivery.status === 'RETURNED';
                  const isNext = !isDelivered && !isFailed && (index === 0 || routeDeliveries[index - 1].status === 'DELIVERED');

                  return (
                    <tr key={delivery.id} className="hover:bg-slate-50 group relative">
                      {/* Timeline */}
                      <td className="relative p-0 w-16">
                        {routeDeliveries.length > 1 && (
                          <div className={`
                            absolute left-1/2 -ml-px w-0.5 bg-slate-200 -z-10
                            ${index === 0 ? 'top-1/2 bottom-0' :
                              index === routeDeliveries.length - 1 ? 'top-0 bottom-1/2' :
                                'top-0 bottom-0'}
                          `}></div>
                        )}
                        <div className="flex h-full items-center justify-center py-4">
                          <div className={`
                            relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                            ${isDelivered ? 'bg-green-100 border-green-500 text-green-700' :
                              isFailed ? 'bg-red-100 border-red-500 text-red-700' :
                                isNext ? 'bg-blue-100 border-blue-500 text-blue-700' :
                                  'bg-slate-50 border-slate-300 text-slate-400'}
                          `}>
                            {index + 1}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-slate-800">{delivery.customer.tradeName}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <FileText size={12} /> {delivery.invoiceNumber}
                        </div>
                        <div className="md:hidden text-xs text-slate-500 mt-1 truncate max-w-[150px]">
                          {delivery.customer.location?.address}
                        </div>
                      </td>

                      <td className="p-4 text-slate-500 max-w-xs truncate hidden md:table-cell" title={delivery.customer.location?.address}>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="shrink-0" /> {delivery.customer.location?.address}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {(isDelivered || isFailed) && delivery.updatedAt ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock size={14} className="text-slate-400" />
                            {new Date(delivery.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      {showFinancials && <td className="p-4 text-right hidden md:table-cell">{formatCurrency(Number(delivery.value || 0))}</td>}

                      <td className="p-4 text-center">
                        {delivery.proofOfDelivery ? (
                          <button
                            onClick={() => setSelectedImage({ url: delivery.proofOfDelivery!, title: delivery.customer.tradeName })}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            title="Ver Comprovante"
                          >
                            <Camera size={18} />
                          </button>
                        ) : (
                          isDelivered ? (
                            <div className="flex justify-center" title="Sem foto do comprovante">
                              <AlertTriangle size={18} className="text-orange-300" />
                            </div>
                          ) : (
                            <span className="text-slate-200">-</span>
                          )
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${isDelivered ? 'bg-green-100 text-green-700' :
                          delivery.status === 'PENDING' ? 'bg-slate-100 text-slate-500' :
                            delivery.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                          }`}>
                          {isDelivered ? 'ENTREGUE' :
                            delivery.status === 'PENDING' ? 'PENDENTE' :
                              delivery.status === 'IN_TRANSIT' ? 'EM ROTA' : 'FALHA'}
                        </span>
                      </td>

                      <td className="p-4 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === delivery.id ? null : delivery.id);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {actionMenuOpen === delivery.id && (
                          <div className="absolute right-8 top-8 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-20 py-1 text-left animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeliveryToUpdate(delivery);
                                setActionMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                            >
                              <CheckSquare size={16} /> Forçar Baixa
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewMapRoute(route);
                                setFocusedDeliveryId(delivery.id);
                                setActionMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                            >
                              <MapIcon size={16} /> Ver no Mapa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST (All Routes) ---
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto relative">
      {/* MODAL DE MAPA */}
      {viewMapRoute && (
        <RouteMapModal
          route={viewMapRoute}
          deliveries={deliveries}
          onClose={() => setViewMapRoute(null)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Waypoints className="text-blue-600" /> Gestão de Rotas
          </h1>
          <p className="text-slate-500 mt-1">Acompanhe o progresso e status das rotas em tempo real.</p>
        </div>
      </div>

      {/* TOOLBAR: FILTERS & TABS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
        {/* Top Row: Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'ACTIVE', label: 'Em Rota' },
            { id: 'PLANNED', label: 'Planejadas' },
            { id: 'ALL', label: 'Histórico' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bottom Row: Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar rota por nome..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          {/* Driver Filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none bg-white"
            >
              <option value="ALL">Todos os Motoristas</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Filter */}
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none bg-white"
            >
              <option value="ALL">Todos os Veículos</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 whitespace-nowrap">Nome da Rota</th>
                <th className="p-4 whitespace-nowrap">Motorista</th>
                <th className="p-4 whitespace-nowrap">Veículo</th>
                <th className="p-4 whitespace-nowrap w-64">Progresso</th>
                {showVolume && <th className="p-4 text-right whitespace-nowrap">{volumeLabel}</th>}
                {showFinancials && <th className="p-4 text-right whitespace-nowrap">Valor Total</th>}
                <th className="p-4 whitespace-nowrap">Início / Fim</th>
                <th className="p-4 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhuma rota encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((route) => {
                  const stats = getRouteStats(route);
                  return (
                    <tr key={route.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRouteId(route.id)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          {route.name}
                        </button>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
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
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-slate-400" />
                          {stats.vehiclePlate}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="w-full bg-slate-100 rounded-full h-3 flex overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${stats.successPct}%` }} />
                            <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${stats.failedPct}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{stats.deliveredCount} ok</span>
                            <span>{stats.failedCount} falhas</span>
                          </div>
                        </div>
                      </td>
                      {showVolume && <td className="p-4 text-right">{stats.totalVolume.toFixed(2)}</td>}
                      {showFinancials && <td className="p-4 text-right">{formatCurrency(stats.totalValue)}</td>}
                      <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                        <div>{route.startTime || '--:--'}</div>
                        <div>{route.endTime || '--:--'}</div>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="md:hidden space-y-4">
        {filteredRoutes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            Nenhuma rota encontrada.
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const stats = getRouteStats(route);
            return (
              <div
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{route.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Truck size={12} /> {stats.vehiclePlate}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {route.startTime || '--:--'}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${route.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                      route.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-500'
                    }`}>
                    {route.status === 'ACTIVE' ? 'EM ROTA' :
                      route.status === 'COMPLETED' ? 'FIM' : 'PLAN'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3 p-2 bg-slate-50 rounded-lg">
                  {stats.driverAvatar ? (
                    <img src={stats.driverAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                      <User size={16} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700">{stats.driverName}</p>
                    <p className="text-xs text-slate-400">Motorista</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Progresso</span>
                    <span>{stats.successPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${stats.successPct}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${stats.failedPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{stats.deliveredCount} entregues</span>
                    <span>{stats.totalDeliveries} total</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                  <button className="text-blue-600 text-sm font-bold flex items-center gap-1">
                    Ver Detalhes <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};