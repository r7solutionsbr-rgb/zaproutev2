import React, { useState, useEffect } from 'react';
import { Route, Delivery, DeliveryStatus } from '../types';
import {
  Waypoints,
  Truck,
  User,
  Package,
  Clock,
  ArrowLeft,
  MapPin,
  FileText,
  Map as MapIcon,
  Camera,
  Copy,
  MoreVertical,
  CheckSquare,
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
  Loader2,
  CheckCircle,
  Calendar,
} from 'lucide-react';

import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import { getStoredTenantId } from '../utils/tenant';

// Imported Components
import { ImageModal } from '../components/ImageModal';
import { ForceDeliveryModal } from '../components/ForceDeliveryModal';
import { RouteMapModal } from '../components/RouteMapModal';
import { Skeleton } from '../components/ui/Skeleton';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { EmptyState } from '../components/ui/EmptyState';

type RouteStatus = 'PLANNED' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED';

const normalizeRoutesData = (routesData: any[]) => {
  const allDeliveries: Delivery[] = [];
  const processedRoutes = routesData.map((r: any) => {
    if (r.deliveries) {
      r.deliveries.forEach((d: any) => {
        if (d.customer) {
          allDeliveries.push({
            ...d,
            customer: {
              ...d.customer,
              location: d.customer.location || {
                lat: 0,
                lng: 0,
                address: d.customer.addressDetails?.street || '',
              },
              addressDetails: d.customer.addressDetails || {
                street: '',
                number: '',
                neighborhood: '',
                city: '',
                state: '',
                zipCode: '',
              },
            },
          });
        }
      });
    }
    return {
      ...r,
      deliveries: r.deliveries ? r.deliveries.map((d: any) => d.id) : [],
    };
  });

  return { processedRoutes, allDeliveries };
};

const getRouteDeliveries = (route: Route, deliveries: Delivery[]) => {
  if (!Array.isArray(route.deliveries)) return [];
  return deliveries.filter((d) => route.deliveries.includes(d.id));
};

const getRouteProgress = (routeDeliveries: Delivery[], totalOps: number) => {
  const completedOps = routeDeliveries.filter(
    (d) => d.status === 'DELIVERED',
  ).length;
  const failedOps = routeDeliveries.filter(
    (d) => d.status === 'FAILED' || d.status === 'RETURNED',
  ).length;
  const pendingOps = totalOps - completedOps - failedOps;
  const progress =
    totalOps > 0
      ? Math.round(((completedOps + failedOps) / totalOps) * 100)
      : 0;

  return { completedOps, failedOps, pendingOps, progress };
};

export const RouteList: React.FC = () => {
  // --- PAGINAÇÃO REAL (Server-Side) ---
  const [routes, setRoutes] = useState<Route[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]); // Mantido para compatibilidade visual
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10; // Itens por página

  // Filtros de Estado
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');

  // Debounce para busca
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Mantém apenas dados leves do contexto
  const { drivers, vehicles } = useData();

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // --- TENANT CONFIG ---
  const [tenantConfig, setTenantConfig] = useState<any>({});

  // Carrega configurações Iniciais
  useEffect(() => {
    api.tenants.getMe().then((t) => setTenantConfig(t.config || {}));
  }, []);

  // Carrega DADOS (Sempre que filtros ou página mudarem)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const tenantId = getStoredTenantId();
        if (!tenantId) return;

        // Filtros para API
        const filters = {
          startDate,
          endDate,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          driverId: driverFilter !== 'ALL' ? driverFilter : undefined,
          search: debouncedSearch || undefined,
        };

        const result = await api.routes.getAllPaginated(
          tenantId,
          page,
          limit,
          filters,
        );

        // Atualiza Meta de Paginação
        setTotalPages(result.meta.totalPages);
        setTotalRecords(result.meta.total);

        // Processa entregas
        const routesData = result.data;
        const { processedRoutes, allDeliveries } =
          normalizeRoutesData(routesData);

        console.log('Rotas carregadas (paginadas):', processedRoutes.length);

        setRoutes(processedRoutes);
        setDeliveries(allDeliveries);
      } catch (error) {
        console.error('Erro ao carregar dados da lista de rotas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [page, startDate, endDate, statusFilter, driverFilter, debouncedSearch]);

  // Refresh Local (Reset para página 1)
  const refreshLocalData = () => {
    setPage(1); // Isso disparará o useEffect acima
  };

  const showFinancials = tenantConfig.displaySettings?.showFinancials ?? true;
  const showVolume = tenantConfig.displaySettings?.showVolume ?? true;
  const volumeLabel = tenantConfig.displaySettings?.volumeLabel || 'Volume';

  // States for Modals
  const [viewMapRoute, setViewMapRoute] = useState<Route | null>(null);
  const [focusedDeliveryId, setFocusedDeliveryId] = useState<string | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Force Delivery State
  const [deliveryToUpdate, setDeliveryToUpdate] = useState<Delivery | null>(
    null,
  );
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);

  // Filter UI State (Active Tab visual only now, logic handled by statusFilter)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PLANNED' | 'ALL'>(
    'ACTIVE',
  );

  // Sync Tab with Status Filter
  useEffect(() => {
    if (activeTab === 'ACTIVE') setStatusFilter('ACTIVE');
    else if (activeTab === 'PLANNED') setStatusFilter('PLANNED');
    else setStatusFilter('ALL');
    setPage(1); // Reset page on tab change
  }, [activeTab]);

  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const handleForceDelivery = async (
    status: DeliveryStatus,
    reason?: string,
  ) => {
    if (!deliveryToUpdate) return;

    setIsUpdateLoading(true);
    try {
      await api.routes.updateDeliveryStatus(
        deliveryToUpdate.id,
        status,
        undefined,
        reason,
      );
      refreshLocalData();
      setDeliveryToUpdate(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setIsUpdateLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Badge de Status (Reutilizável)
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1.5 w-fit">
            <CheckCircle size={12} /> CONCLUÍDA
          </span>
        );
      case 'IN_PROGRESS':
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1.5 w-fit">
            <Truck size={12} /> EM ROTA
          </span>
        );
      case 'PLANNED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 flex items-center gap-1.5 w-fit">
            <Clock size={12} /> PLANEJADA
          </span>
        );
      default:
        return null;
    }
  };

  // VIEW: DETAIL (Selected Route)
  if (selectedRouteId) {
    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route) return <div>Rota não encontrada</div>;

    const routeDeliveries = deliveries.filter((d) =>
      route.deliveries.some((rd) => rd.id === d.id),
    );

    // Stats calculation inline for detail view
    const totalDeliveries = routeDeliveries.length;
    const deliveredCount = routeDeliveries.filter(
      (d) => d.status === 'DELIVERED',
    ).length;
    const failedCount = routeDeliveries.filter(
      (d) => d.status === 'FAILED' || d.status === 'RETURNED',
    ).length;
    const pendingCount = totalDeliveries - deliveredCount - failedCount;
    const successPct =
      totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 0;
    const failedPct =
      totalDeliveries > 0 ? (failedCount / totalDeliveries) * 100 : 0;
    const totalVolume = routeDeliveries.reduce(
      (acc, d) => acc + Number(d.volume || 0),
      0,
    );
    const totalValue = routeDeliveries.reduce(
      (acc, d) => acc + Number(d.value || 0),
      0,
    );
    const driver = drivers.find((d) => d.id === route.driverId);
    const vehicle = vehicles.find((v) => v.id === route.vehicleId);

    return (
      <div
        className="p-4 md:p-6 max-w-7xl mx-auto relative"
        onClick={() => setActionMenuOpen(null)}
      >
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
                  {driver?.avatarUrl ? (
                    <img
                      src={driver.avatarUrl}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover border border-slate-300"
                    />
                  ) : (
                    <User size={14} />
                  )}
                  {driver?.name || 'Sem Motorista'}
                </div>
                <span className="flex items-center gap-1">
                  <Truck size={14} /> {vehicle?.plate || 'Sem Veículo'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {route.startTime || '--:--'} -{' '}
                  {route.endTime || '--:--'}
                </span>
              </div>
            </div>
            <div className="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-start items-center md:items-end">
              <StatusBadge status={route.status} />
              {showFinancials && (
                <div className="md:mt-2">
                  <div className="text-xl md:text-2xl font-bold text-slate-800">
                    {formatCurrency(totalValue)}
                  </div>
                  <div className="text-xs text-slate-500 text-right hidden md:block">
                    Valor Total
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">
                Entregas
              </span>
              <span className="text-lg font-semibold">{totalDeliveries}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">
                Pendentes
              </span>
              <span className="text-lg font-semibold text-orange-600">
                {pendingCount}
              </span>
            </div>
            {showVolume && (
              <div>
                <span className="block text-xs text-slate-400 uppercase font-bold">
                  {volumeLabel}
                </span>
                <span className="text-lg font-semibold">
                  {totalVolume.toFixed(2)}
                </span>
              </div>
            )}
            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold">
                Progresso
              </span>
              <div className="w-full bg-slate-100 rounded-full h-3 mt-2 flex overflow-hidden">
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${successPct}%` }}
                  title="Entregues"
                ></div>
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${failedPct}%` }}
                  title="Falhas"
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{deliveredCount} entregues</span>
                {failedCount > 0 && (
                  <span className="text-red-500 font-bold">
                    {failedCount} falhas
                  </span>
                )}
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
                  {showFinancials && (
                    <th className="p-4 text-right hidden md:table-cell">
                      Valor
                    </th>
                  )}
                  <th className="p-4 text-center">Evidência</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routeDeliveries.map((delivery, index) => {
                  const isDelivered = delivery.status === 'DELIVERED';
                  const isFailed =
                    delivery.status === 'FAILED' ||
                    delivery.status === 'RETURNED';
                  const isNext =
                    !isDelivered &&
                    !isFailed &&
                    (index === 0 ||
                      routeDeliveries[index - 1].status === 'DELIVERED');

                  return (
                    <tr
                      key={delivery.id}
                      className="hover:bg-slate-50 group relative"
                    >
                      {/* Timeline */}
                      <td className="relative p-0 w-16">
                        {routeDeliveries.length > 1 && (
                          <div
                            className={`
                            absolute left-1/2 -ml-px w-0.5 bg-slate-200 -z-10
                            ${index === 0
                                ? 'top-1/2 bottom-0'
                                : index === routeDeliveries.length - 1
                                  ? 'top-0 bottom-1/2'
                                  : 'top-0 bottom-0'
                              }
                          `}
                          ></div>
                        )}
                        <div className="flex h-full items-center justify-center py-4">
                          <div
                            className={`
                            relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                            ${isDelivered
                                ? 'bg-green-100 border-green-500 text-green-700'
                                : isFailed
                                  ? 'bg-red-100 border-red-500 text-red-700'
                                  : isNext
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'bg-slate-50 border-slate-300 text-slate-400'
                              }
                          `}
                          >
                            {index + 1}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-slate-800">
                          {delivery.customer.tradeName}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <FileText size={12} /> {delivery.invoiceNumber}
                        </div>
                        <div className="md:hidden text-xs text-slate-500 mt-1 truncate max-w-[150px]">
                          {delivery.customer.location?.address}
                        </div>
                      </td>

                      <td
                        className="p-4 text-slate-500 max-w-xs truncate hidden md:table-cell"
                        title={delivery.customer.location?.address}
                      >
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="shrink-0" />{' '}
                          {delivery.customer.location?.address}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {(isDelivered || isFailed) && delivery.updatedAt ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock size={14} className="text-slate-400" />
                            {new Date(delivery.updatedAt).toLocaleTimeString(
                              'pt-BR',
                              { hour: '2-digit', minute: '2-digit' },
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      {showFinancials && (
                        <td className="p-4 text-right hidden md:table-cell">
                          {formatCurrency(Number(delivery.value || 0))}
                        </td>
                      )}

                      <td className="p-4 text-center">
                        {delivery.proofOfDelivery ? (
                          <button
                            onClick={() =>
                              setSelectedImage({
                                url: delivery.proofOfDelivery!,
                                title: delivery.customer.tradeName,
                              })
                            }
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            title="Ver Comprovante"
                          >
                            <Camera size={18} />
                          </button>
                        ) : isDelivered ? (
                          <div
                            className="flex justify-center"
                            title="Sem foto do comprovante"
                          >
                            <AlertTriangle
                              size={18}
                              className="text-orange-300"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${isDelivered
                              ? 'bg-green-100 text-green-700'
                              : delivery.status === 'PENDING'
                                ? 'bg-slate-100 text-slate-500'
                                : delivery.status === 'IN_TRANSIT'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                        >
                          {isDelivered
                            ? 'ENTREGUE'
                            : delivery.status === 'PENDING'
                              ? 'PENDENTE'
                              : delivery.status === 'IN_TRANSIT'
                                ? 'EM ROTA'
                                : 'FALHA'}
                        </span>
                      </td>

                      <td className="p-4 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(
                              actionMenuOpen === delivery.id
                                ? null
                                : delivery.id,
                            );
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

  // VIEW: LIST (All Routes)
  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {/* MODAL DE MAPA */}
      {viewMapRoute && (
        <RouteMapModal
          route={viewMapRoute}
          deliveries={deliveries}
          onClose={() => setViewMapRoute(null)}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Waypoints className="text-blue-600" /> Gestão de Rotas
          </h1>
          <p className="text-slate-500 mt-1">
            Acompanhe o progresso e status das rotas em tempo real.
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
            <Loader2 size={16} className="animate-spin" /> Atualizando...
          </div>
        )}
      </div>

      {/* TOOLBAR: FILTERS & TABS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
        {/* TABS */}
        <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
          {[
            { id: 'ACTIVE', label: 'Em Andamento' },
            { id: 'PLANNED', label: 'Planejadas' },
            { id: 'ALL', label: 'Todas as Rotas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-4 py-2 text-sm font-medium transition-all rounded-lg whitespace-nowrap flex items-center gap-2
                ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FILTROS AVANÇADOS */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Busca Textual */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar rota, motorista ou placa..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Filtros de Seleção */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Drivers */}
            <div className="relative min-w-[180px]">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <select
                value={driverFilter}
                onChange={(e) => {
                  setDriverFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:border-blue-300 transition-colors text-slate-600"
              >
                <option value="ALL">Todos Motoristas</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronRight
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90"
                size={14}
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <div className="px-2 text-slate-400 border-r border-slate-200">
                <Calendar size={16} />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-sm text-slate-600 outline-none w-28 cursor-pointer"
              />
              <span className="text-slate-300 text-sm">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-sm text-slate-600 outline-none w-28 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE ROTAS (PAGINADA) */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          routes.map((route) => {
            const totalOps = Array.isArray(route.deliveries)
              ? route.deliveries.length
              : 0;
            const routeDeliveries = getRouteDeliveries(route, deliveries);
            const { completedOps, pendingOps, progress } = getRouteProgress(
              routeDeliveries,
              totalOps,
            );

            const driver = drivers.find((d) => d.id === route.driverId);
            const vehicle = vehicles.find((v) => v.id === route.vehicleId);

            return (
              <div
                key={route.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 flex flex-col md:flex-row gap-6">
                  {/* Esquerda: Info Principal */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-800">
                          {route.name}
                        </h3>
                        <StatusBadge status={route.status} />
                      </div>
                      <span className="text-sm text-slate-500 flex items-center gap-1 font-mono bg-slate-50 px-2 py-1 rounded">
                        <Calendar size={14} />
                        {new Date(route.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-3">
                        {driver ? (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                            {driver.avatarUrl ? (
                              <img
                                src={driver.avatarUrl}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              driver.name.charAt(0)
                            )}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300">
                            <User size={20} />
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-slate-400 uppercase font-bold block">
                            Motorista
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {driver?.name || 'Não atribuído'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                          <Truck size={20} />
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 uppercase font-bold block">
                            Veículo
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {vehicle
                              ? `${vehicle.model} (${vehicle.plate})`
                              : 'Não definido'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direita: Progresso e Ações */}
                  <div className="flex flex-col justify-between min-w-[200px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Progresso</span>
                        <span className="font-bold text-blue-600">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>{completedOps} entregues</span>
                        <span>{pendingOps} pendentes</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewMapRoute(route)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver no Mapa"
                      >
                        <MapIcon size={20} />
                      </button>
                      <button
                        onClick={() =>
                          setSelectedRouteId(
                            route.id === selectedRouteId ? null : route.id,
                          )
                        }
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${selectedRouteId === route.id
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                          }`}
                      >
                        {selectedRouteId === route.id
                          ? 'Ver Detalhes'
                          : 'Ver Detalhes'}
                        <ChevronRight
                          size={16}
                          className={`transition-transform duration-300 ${selectedRouteId === route.id ? 'rotate-90' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* AREA EXPANDIDA DE ENTREGAS (Prévia) */}
                {selectedRouteId === route.id && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                          <tr>
                            <th className="p-3">Cliente</th>
                            <th className="p-3">Endereço</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {routeDeliveries.map((dev) => (
                            <tr key={dev.id} className="hover:bg-slate-50">
                              <td className="p-3 font-medium text-slate-700">
                                {dev.customer.tradeName}
                              </td>
                              <td className="p-3 text-slate-500 truncate max-w-[200px]">
                                {dev.customer.location?.address}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${dev.status === 'DELIVERED'
                                      ? 'bg-green-100 text-green-700'
                                      : dev.status === 'FAILED'
                                        ? 'bg-red-100 text-red-700'
                                        : dev.status === 'IN_TRANSIT'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                  {dev.status === 'DELIVERED'
                                    ? 'Entregue'
                                    : dev.status === 'FAILED'
                                      ? 'Falha'
                                      : dev.status === 'IN_TRANSIT'
                                        ? 'Em Rota'
                                        : 'Pendente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {routeDeliveries.length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="p-4 text-center text-slate-400"
                              >
                                Sem entregas nesta rota.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <div className="p-2 border-t border-slate-100 text-center bg-slate-50">
                        <span
                          className="text-xs text-blue-600 font-medium cursor-pointer hover:underline"
                          onClick={() => setSelectedRouteId(route.id)}
                        >
                          Abrir tela completa desta rota
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {routes.length === 0 && !isLoading && (
          <EmptyState
            icon={Waypoints}
            title="Nenhuma rota encontrada"
            description="Tente ajustar os filtros ou a busca para encontrar o que procura."
          />
        )}
      </div>

      {/* CONTROLES DE PAGINAÇÃO */}
      <div className="flex items-center justify-between mt-8 border-t border-slate-200 pt-6">
        <div className="text-sm text-slate-500">
          Mostrando página{' '}
          <span className="font-bold text-slate-800">{page}</span> de{' '}
          <span className="font-bold text-slate-800">{totalPages}</span> (
          {totalRecords} registros)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1 hidden md:flex">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Lógica simples de paginação visual (1 2 3 4 5 ...)
              let pNum = i + 1;
              if (totalPages > 5 && page > 3) pNum = page - 2 + i;
              if (totalPages > 5 && pNum > totalPages)
                pNum = totalPages - (4 - i);
              if (pNum < 1) pNum = 1;

              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${page === pNum
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
};
