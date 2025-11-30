import React, { useState, useEffect, useRef } from 'react';
import { Route, Delivery, Driver, DeliveryStatus, Vehicle } from '../types';
import { Waypoints, Truck, User, Package, Clock, AlertCircle, DollarSign, ArrowLeft, MapPin, FileText, CheckCircle2, Map as MapIcon, ChevronRight, X, Camera, Copy, MoreVertical, Edit, CheckSquare, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useData } from '../contexts/DataContext';

import { api } from '../services/api';

// --- LEAFLET ICONS ---
const createIcon = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const icons = { blue: createIcon('blue'), green: createIcon('green'), red: createIcon('red'), grey: createIcon('grey') };

// --- HELPER: RECENTER MAP ---
const RecenterMap = ({ points, focusPoint }: { points: { lat: number, lng: number }[], focusPoint?: { lat: number, lng: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (focusPoint) {
      map.flyTo([focusPoint.lat, focusPoint.lng], 16, { duration: 1.5 });
    } else if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map, focusPoint]);
  return null;
};

// --- HELPER: INVALIDATE SIZE (Fix para Modal) ---
const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    // Força o Leaflet a recalcular o tamanho após o modal abrir/animar
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// --- COMPONENT: ROUTE MAP MODAL ---
interface RouteMapModalProps {
  route: Route;
  deliveries: Delivery[];
  onClose: () => void;
  focusDeliveryId?: string | null;
}

const RouteMapModal: React.FC<RouteMapModalProps> = ({ route, deliveries, onClose, focusDeliveryId }) => {
  const [mapReady, setMapReady] = useState(false);
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  // Filtra as entregas desta rota
  const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));

  // Extrai pontos válidos (lat/lng)
  const points = routeDeliveries
    .filter(d => d.customer.location && d.customer.location.lat && d.customer.location.lng)
    .map(d => ({
      id: d.id,
      lat: d.customer.location.lat,
      lng: d.customer.location.lng,
      status: d.status,
      customerName: d.customer.tradeName,
      invoiceNumber: d.invoiceNumber,
      address: d.customer.location.address,
      volume: d.volume,
      value: d.value,
      updatedAt: d.updatedAt
    }));

  const focusPoint = focusDeliveryId ? points.find(p => p.id === focusDeliveryId) : null;

  useEffect(() => {
    if (mapReady && focusDeliveryId && markerRefs.current[focusDeliveryId]) {
      // Pequeno delay para garantir que o mapa terminou de renderizar/voar
      setTimeout(() => {
        markerRefs.current[focusDeliveryId]?.openPopup();
      }, 1000);
    }
  }, [mapReady, focusDeliveryId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MapIcon className="text-blue-600" size={20} />
              Trajeto da Rota: {route.name}
            </h2>
            <p className="text-xs text-slate-500">{points.length} pontos de entrega mapeados</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Map Body */}
        <div className="flex-1 relative bg-slate-100">
          {points.length > 0 ? (
            <MapContainer
              center={[points[0].lat, points[0].lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              whenReady={() => setMapReady(true)}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap points={points} focusPoint={focusPoint} />
              <MapInvalidator />

              {/* Marcadores */}
              {points.map((p, idx) => (
                <Marker
                  key={idx}
                  position={[p.lat, p.lng]}
                  ref={(ref) => {
                    if (ref) markerRefs.current[p.id] = ref;
                  }}
                  icon={
                    p.status === DeliveryStatus.DELIVERED ? icons.green :
                      p.status === DeliveryStatus.FAILED || p.status === DeliveryStatus.RETURNED ? icons.red :
                        icons.blue
                  }
                >
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[200px]">
                      {/* Cabeçalho */}
                      <div className="mb-2 border-b border-slate-100 pb-2">
                        <strong className="text-sm block text-slate-800">{p.customerName}</strong>
                        <span className="text-xs text-slate-500 block">NF: {p.invoiceNumber}</span>
                      </div>

                      {/* Corpo */}
                      <div className="space-y-1 mb-2">
                        <div className="flex items-start gap-1 text-xs text-slate-600">
                          <MapPin size={12} className="mt-0.5 shrink-0" />
                          <span className="leading-tight">{p.address}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-1 rounded">
                          <span>{p.volume} m³</span>
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}</span>
                        </div>
                      </div>

                      {/* Rodapé Status */}
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === DeliveryStatus.DELIVERED ? 'bg-green-100 text-green-700' :
                          p.status === DeliveryStatus.FAILED || p.status === DeliveryStatus.RETURNED ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                          {p.status === DeliveryStatus.DELIVERED ? 'ENTREGUE' :
                            p.status === DeliveryStatus.FAILED ? 'FALHA' :
                              p.status === DeliveryStatus.RETURNED ? 'DEVOLVIDO' :
                                p.status === DeliveryStatus.IN_TRANSIT ? 'EM ROTA' : 'PENDENTE'}
                        </span>

                        {(p.status === DeliveryStatus.DELIVERED || p.status === DeliveryStatus.FAILED || p.status === DeliveryStatus.RETURNED) && p.updatedAt && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                            <Clock size={10} />
                            {new Date(p.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Linha do Trajeto */}
              <Polyline
                positions={points.map(p => [p.lat, p.lng])}
                color="#2563eb"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MapIcon size={48} className="mb-2 opacity-20" />
              <p>Nenhuma localização válida encontrada para esta rota.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: IMAGE MODAL (LIGHTBOX) ---
interface ImageModalProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      >
        <X size={24} />
      </button>

      <div className="max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt="Comprovante"
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {title && (
          <p className="mt-4 text-white font-medium text-lg text-center">{title}</p>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT: FORCE DELIVERY MODAL ---
interface ForceDeliveryModalProps {
  delivery: Delivery;
  onConfirm: (status: DeliveryStatus, reason?: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const ForceDeliveryModal: React.FC<ForceDeliveryModalProps> = ({ delivery, onConfirm, onClose, isLoading }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare size={18} className="text-blue-600" />
            Baixa Manual de Entrega
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
            <p className="font-bold">{delivery.customer.tradeName}</p>
            <p className="text-xs mt-1">NF: {delivery.invoiceNumber}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Observação (Opcional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
              placeholder="Ex: Cliente recebeu, mas app do motorista travou..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onConfirm(DeliveryStatus.DELIVERED, reason)}
              disabled={isLoading}
              className="flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-200 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={24} />
              <span className="font-bold text-sm">Confirmar Entrega</span>
            </button>

            <button
              onClick={() => onConfirm(DeliveryStatus.FAILED, reason)}
              disabled={isLoading}
              className="flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 border-red-100 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-200 transition-all disabled:opacity-50"
            >
              <AlertTriangle size={24} />
              <span className="font-bold text-sm">Registrar Falha</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT: ROUTE LIST ---
export const RouteList: React.FC = () => {
  const { routes, deliveries, drivers, vehicles, refreshData } = useData();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // States for Modals
  const [viewMapRoute, setViewMapRoute] = useState<Route | null>(null);
  const [focusedDeliveryId, setFocusedDeliveryId] = useState<string | null>(null); // Para focar no mapa

  const [selectedImage, setSelectedImage] = useState<{ url: string, title: string } | null>(null);

  // Force Delivery State
  const [deliveryToUpdate, setDeliveryToUpdate] = useState<Delivery | null>(null);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PLANNED' | 'ALL'>('ACTIVE');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const handleForceDelivery = async (status: DeliveryStatus, reason?: string) => {
    if (!deliveryToUpdate) return;

    setIsUpdateLoading(true);
    try {
      await api.routes.updateDeliveryStatus(deliveryToUpdate.id, status, undefined, reason);
      await refreshData(); // Recarrega dados
      setDeliveryToUpdate(null); // Fecha modal
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

    // Contagens por Status
    const pendingCount = routeDeliveries.filter(d => d.status === DeliveryStatus.PENDING || d.status === DeliveryStatus.IN_TRANSIT).length;
    const deliveredCount = routeDeliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
    const failedCount = routeDeliveries.filter(d => d.status === DeliveryStatus.FAILED || d.status === DeliveryStatus.RETURNED).length;

    const total = routeDeliveries.length;

    // Porcentagens para a Barra Segmentada
    const successPct = total > 0 ? (deliveredCount / total) * 100 : 0;
    const failedPct = total > 0 ? (failedCount / total) * 100 : 0;
    // O restante é pendente (cinza)

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

  const filteredRoutes = routes.filter(route => {
    if (activeTab === 'ALL') return true;
    return route.status === activeTab;
  });

  // --- VIEW: DETAIL (Selected Route) ---
  if (selectedRouteId) {
    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return <div>Rota não encontrada</div>;

    const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));
    const stats = getRouteStats(route);

    return (
      <div className="p-6 max-w-7xl mx-auto relative" onClick={() => setActionMenuOpen(null)}>

        {/* MODAL DE IMAGEM (LIGHTBOX) */}
        {selectedImage && (
          <ImageModal
            imageUrl={selectedImage.url}
            title={selectedImage.title}
            onClose={() => setSelectedImage(null)}
          />
        )}

        {/* MODAL DE BAIXA MANUAL */}
        {deliveryToUpdate && (
          <ForceDeliveryModal
            delivery={deliveryToUpdate}
            onConfirm={handleForceDelivery}
            onClose={() => setDeliveryToUpdate(null)}
            isLoading={isUpdateLoading}
          />
        )}

        {/* MODAL DE MAPA (COM FOCO) */}
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
          <ArrowLeft size={20} /> Voltar para Lista de Rotas
        </button>

        {/* Route Header Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
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
              {/* Barra Segmentada no Detalhe também */}
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
                  <th className="p-4">Endereço</th>
                  <th className="p-4">Horário</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Evidência</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routeDeliveries.map((delivery, index) => {
                  // Lógica da Timeline
                  const isLast = index === routeDeliveries.length - 1;
                  const isDelivered = delivery.status === DeliveryStatus.DELIVERED;
                  const isFailed = delivery.status === DeliveryStatus.FAILED || delivery.status === DeliveryStatus.RETURNED;
                  const isNext = !isDelivered && !isFailed && (index === 0 || routeDeliveries[index - 1].status === DeliveryStatus.DELIVERED);

                  return (
                    <tr key={delivery.id} className="hover:bg-slate-50 group relative">
                      {/* COLUNA TIMELINE */}
                      <td className="relative p-0 w-16">
                        {/* Linha Vertical */}
                        {routeDeliveries.length > 1 && (
                          <div className={`
                            absolute left-1/2 -ml-px w-0.5 bg-slate-200 -z-10
                            ${index === 0 ? 'top-1/2 bottom-0' :
                              index === routeDeliveries.length - 1 ? 'top-0 bottom-1/2' :
                                'top-0 bottom-0'}
                          `}></div>
                        )}

                        {/* Conteúdo Centralizado (Bolinha) */}
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

                      {/* CLIENTE + NF AGRUPADOS */}
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{delivery.customer.tradeName}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <FileText size={12} /> {delivery.invoiceNumber}
                        </div>
                      </td>

                      <td className="p-4 text-slate-500 max-w-xs truncate" title={delivery.customer.location.address}>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="shrink-0" /> {delivery.customer.location.address}
                        </div>
                      </td>

                      {/* COLUNA HORÁRIO */}
                      <td className="p-4 whitespace-nowrap">
                        {(delivery.status === DeliveryStatus.DELIVERED || delivery.status === DeliveryStatus.FAILED || delivery.status === DeliveryStatus.RETURNED) && delivery.updatedAt ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock size={14} className="text-slate-400" />
                            {new Date(delivery.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      <td className="p-4 text-right">{formatCurrency(Number(delivery.value || 0))}</td>

                      {/* COLUNA EVIDÊNCIA */}
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

                      {/* COLUNA AÇÕES (MENU) */}
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

                        {/* Dropdown Menu */}
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
    <div className="p-6 max-w-7xl mx-auto relative">

      {/* MODAL DE MAPA */}
      {viewMapRoute && (
        <RouteMapModal
          route={viewMapRoute}
          deliveries={deliveries}
          onClose={() => setViewMapRoute(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Waypoints className="text-blue-600" /> Gestão de Rotas
          </h1>
          <p className="text-slate-500 mt-1">Acompanhe o progresso e status das rotas em tempo real.</p>
        </div>
      </div>

      {/* ABAS DE FILTRO */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'ACTIVE', label: 'Em Rota' },
          { id: 'PLANNED', label: 'Planejadas' },
          { id: 'ALL', label: 'Histórico Completo' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 whitespace-nowrap">Nome da Rota</th>
                <th className="p-4 whitespace-nowrap">Motorista</th>
                <th className="p-4 whitespace-nowrap">Veículo</th>
                <th className="p-4 whitespace-nowrap w-64">Progresso</th>
                <th className="p-4 text-right whitespace-nowrap">Volume (m³)</th>
                <th className="p-4 text-right whitespace-nowrap">Valor Total</th>
                <th className="p-4 whitespace-nowrap">Início / Fim</th>

                {/* COLUNA CONDICIONAL: AÇÕES ou STATUS */}
                {activeTab === 'ACTIVE' ? (
                  <th className="p-4 text-center whitespace-nowrap">Ações</th>
                ) : (
                  <th className="p-4 text-center whitespace-nowrap">Status</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoutes.map((route) => {
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
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Truck size={16} className="text-slate-400" />
                        {stats.vehiclePlate}
                      </div>
                    </td>

                    {/* COLUNA DE PROGRESSO SEGMENTADA */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="w-full bg-slate-100 rounded-full h-3 flex overflow-hidden">
                          {/* Segmento VERDE (Entregues) */}
                          <div
                            className="bg-green-500 h-full transition-all duration-500"
                            style={{ width: `${stats.successPct}%` }}
                          />
                          {/* Segmento VERMELHO (Falhas) */}
                          <div
                            className="bg-red-500 h-full transition-all duration-500"
                            style={{ width: `${stats.failedPct}%` }}
                          />
                          {/* O resto fica cinza (bg-slate-100 do container) */}
                        </div>

                        <div className="flex justify-between items-center text-xs font-medium">
                          <span className="text-slate-500">
                            {stats.deliveredCount}/{stats.totalDeliveries} concluídas
                          </span>
                          {stats.failedCount > 0 && (
                            <span className="text-red-500 font-bold flex items-center gap-1">
                              <AlertCircle size={10} /> {stats.failedCount} falhas
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-right font-mono whitespace-nowrap">
                      {stats.totalVolume.toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-medium text-slate-800 whitespace-nowrap">
                      {formatCurrency(stats.totalValue)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={12} className="text-green-500" /> {route.startTime || '--:--'}</span>
                        <span className="flex items-center gap-1"><Clock size={12} className="text-red-500" /> {route.endTime || '--:--'}</span>
                      </div>
                    </td>

                    {/* COLUNA CONDICIONAL: AÇÕES ou STATUS */}
                    <td className="p-4 text-center whitespace-nowrap">
                      {activeTab === 'ACTIVE' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Ver no Mapa"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewMapRoute(route); // Abre o Modal
                            }}
                          >
                            <MapIcon size={18} />
                          </button>
                          <button
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                            title="Ver Detalhes"
                            onClick={() => setSelectedRouteId(route.id)}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${route.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                          route.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                          {route.status === 'ACTIVE' ? 'EM ROTA' :
                            route.status === 'COMPLETED' ? 'FINALIZADA' : 'PLANEJADA'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRoutes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <AlertCircle size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium text-slate-500">Nenhuma rota encontrada</p>
                      <p className="text-sm">Tente mudar o filtro ou cadastre uma nova rota.</p>
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