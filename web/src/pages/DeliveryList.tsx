import React, { useState, useEffect } from 'react';
import { Delivery, Driver, DeliveryStatus } from '../types';
import { Package, User, MapPin, DollarSign, Calendar, ArrowLeft, CheckCircle, XCircle, Truck, FileText, AlertTriangle, Search, Filter, Eye, Clock, AlertCircle, X, Map as MapIcon, ZoomIn } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Ensure CSS is imported if not globally

import { useData } from '../contexts/DataContext';

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

// --- HELPER: INVALIDATE SIZE (Fix para Modal) ---
const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// --- COMPONENT: SINGLE DELIVERY MAP MODAL ---
interface SingleDeliveryMapModalProps {
  delivery: Delivery;
  onClose: () => void;
}

const SingleDeliveryMapModal: React.FC<SingleDeliveryMapModalProps> = ({ delivery, onClose }) => {
  const hasLocation = delivery.customer.location && delivery.customer.location.lat && delivery.customer.location.lng;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MapIcon size={18} className="text-blue-600" />
            Localização do Cliente
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="h-[400px] bg-slate-100 relative">
          {hasLocation ? (
            <MapContainer
              center={[delivery.customer.location.lat, delivery.customer.location.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapInvalidator />
              <Marker
                position={[delivery.customer.location.lat, delivery.customer.location.lng]}
                icon={icons.blue}
              >
                <Popup>
                  <div className="p-1">
                    <strong className="block text-sm text-slate-800">{delivery.customer.tradeName}</strong>
                    <span className="text-xs text-slate-600">{delivery.customer.location.address}</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
              <MapIcon size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-slate-600">Localização Indisponível</p>
              <p className="text-sm mt-1">Este cliente não possui coordenadas geográficas cadastradas.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
          <span>{delivery.customer.location.address}</span>
          {!hasLocation && <span className="text-red-500 font-bold">Sem GPS</span>}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: DELIVERY DETAIL MODAL ---
interface DeliveryDetailModalProps {
  delivery: Delivery;
  driver?: Driver | null;
  onClose: () => void;
}

const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({ delivery, driver, onClose }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
      {/* Lightbox Overlay */}
      {isLightboxOpen && delivery.proofOfDelivery && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img
            src={delivery.proofOfDelivery}
            alt="Evidência Fullscreen"
            className="max-w-full max-h-full object-contain animate-in zoom-in duration-300"
          />
          <button className="absolute top-4 right-4 text-white hover:text-slate-300">
            <X size={32} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{delivery.customer.tradeName}</h2>
            <p className="text-sm text-slate-500 font-mono mt-1">NF: {delivery.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Status</span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full inline-block
                ${delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                  delivery.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    'bg-slate-200 text-slate-600'}`}>
                {delivery.status}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Atualizado em</span>
              <p className="text-sm font-medium text-slate-700">{formatDate(delivery.updatedAt)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Valor</span>
              <p className="text-sm font-medium text-slate-700">{formatCurrency(delivery.value)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg col-span-2 md:col-span-1">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Motorista</span>
              <div className="flex items-center gap-2">
                {driver ? (
                  <>
                    <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden">
                      {driver.avatarUrl ? <img src={driver.avatarUrl} className="w-full h-full object-cover" /> : driver.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate">{driver.name}</span>
                  </>
                ) : <span className="text-sm text-slate-400 italic">Não atribuído</span>}
              </div>
            </div>
          </div>

          {/* Ocorrência (Se houver) */}
          {(delivery.status === 'FAILED' || delivery.status === 'RETURNED') && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <h4 className="text-red-800 font-bold text-sm flex items-center gap-2 mb-1">
                <AlertTriangle size={16} /> Ocorrência Registrada
              </h4>
              <p className="text-red-600 text-sm">{delivery.failureReason || 'Motivo não especificado.'}</p>
            </div>
          )}

          {/* Evidência / Comprovante */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileText size={18} /> Evidência de Entrega
            </h3>
            {delivery.proofOfDelivery ? (
              <div
                className="relative group cursor-zoom-in rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                onClick={() => setIsLightboxOpen(true)}
              >
                <img
                  src={delivery.proofOfDelivery}
                  alt="Comprovante"
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={32} />
                </div>
              </div>
            ) : (
              <div className="h-32 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                <FileText size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Nenhuma evidência registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DeliveryList: React.FC = () => {
  const { deliveries, drivers } = useData();
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null); // Este estado pode ser removido se a navegação de detalhes for apenas via modal
  const [mapDelivery, setMapDelivery] = useState<Delivery | null>(null);
  const [detailDelivery, setDetailDelivery] = useState<Delivery | null>(null); // Estado para o Modal de Detalhes

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'PROBLEMS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyPriority, setOnlyPriority] = useState(false);

  // Filtros de Data
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getDriver = (driverId?: string) => {
    if (!driverId) return null;
    return drivers.find(d => d.id === driverId);
  };

  // --- FILTROS ---
  const filteredDeliveries = deliveries.filter(d => {
    // 1. Filtro de Data (Frontend Temporário)
    if (d.updatedAt) {
      const deliveryDate = new Date(d.updatedAt).toISOString().split('T')[0];
      if (deliveryDate < startDate || deliveryDate > endDate) return false;
    }

    // 2. Filtro por Aba
    if (activeTab === 'PENDING' && d.status !== DeliveryStatus.PENDING) return false;
    if (activeTab === 'IN_TRANSIT' && d.status !== DeliveryStatus.IN_TRANSIT) return false;
    if (activeTab === 'DELIVERED' && d.status !== DeliveryStatus.DELIVERED) return false;
    if (activeTab === 'PROBLEMS' && d.status !== DeliveryStatus.FAILED && d.status !== DeliveryStatus.RETURNED) return false;

    // 3. Filtro de Prioridade
    if (onlyPriority && d.priority !== 'URGENT') return false;

    // 4. Busca (NF ou Cliente)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesInvoice = d.invoiceNumber.toLowerCase().includes(term);
      const matchesCustomer = d.customer.tradeName.toLowerCase().includes(term);
      if (!matchesInvoice && !matchesCustomer) return false;
    }

    return true;
  });

  // --- CONTAGENS PARA ABAS ---
  const getTabCount = (tab: typeof activeTab) => {
    return deliveries.filter(d => {
      // Aplicar filtro de data também nas contagens para ser consistente
      if (d.updatedAt) {
        const deliveryDate = new Date(d.updatedAt).toISOString().split('T')[0];
        if (deliveryDate < startDate || deliveryDate > endDate) return false;
      }

      if (tab === 'PENDING') return d.status === DeliveryStatus.PENDING;
      if (tab === 'IN_TRANSIT') return d.status === DeliveryStatus.IN_TRANSIT;
      if (tab === 'DELIVERED') return d.status === DeliveryStatus.DELIVERED;
      if (tab === 'PROBLEMS') return d.status === DeliveryStatus.FAILED || d.status === DeliveryStatus.RETURNED;
      return true;
    }).length;
  };

  // --- COMPONENTES VISUAIS ---
  const StatusBadge = ({ status }: { status: DeliveryStatus }) => {
    switch (status) {
      case DeliveryStatus.DELIVERED:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1.5 w-fit">
            <CheckCircle size={12} /> ENTREGUE
          </span>
        );
      case DeliveryStatus.IN_TRANSIT:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1.5 w-fit">
            <Truck size={12} /> EM ROTA
          </span>
        );
      case DeliveryStatus.PENDING:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 flex items-center gap-1.5 w-fit">
            <Clock size={12} /> PENDENTE
          </span>
        );
      case DeliveryStatus.FAILED:
      case DeliveryStatus.RETURNED:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1.5 w-fit">
            <AlertCircle size={12} /> {status === DeliveryStatus.FAILED ? 'FALHA' : 'DEVOLVIDO'}
          </span>
        );
      default:
        return null;
    }
  };

  // --- VIEW: LIST ---
  return (
    <div className="p-6 max-w-7xl mx-auto relative">

      {/* MODAL DE MAPA */}
      {mapDelivery && (
        <SingleDeliveryMapModal
          delivery={mapDelivery}
          onClose={() => setMapDelivery(null)}
        />
      )}

      {/* MODAL DE DETALHES */}
      {detailDelivery && (
        <DeliveryDetailModal
          delivery={detailDelivery}
          driver={getDriver(detailDelivery.driverId)}
          onClose={() => setDetailDelivery(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Package className="text-blue-600" /> Gestão de Entregas
          </h1>
          <p className="text-slate-500 mt-1">Visualize todas as notas fiscais e status de entrega.</p>
        </div>
      </div>

      {/* TABS DE FILTRO */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: 'ALL', label: 'Todas' },
          { id: 'PENDING', label: 'Pendentes' },
          { id: 'IN_TRANSIT', label: 'Em Trânsito' },
          { id: 'DELIVERED', label: 'Concluídas' },
          { id: 'PROBLEMS', label: 'Problemas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              px-4 py-2 text-sm font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-2
              ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
            `}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {getTabCount(tab.id as any)}
            </span>
          </button>
        ))}
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 justify-between items-start xl:items-center">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por NF ou Cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Filtro de Data */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 px-2 text-slate-500">
              <Calendar size={14} />
              <span className="text-xs font-bold uppercase">Período:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm text-slate-600 bg-transparent border-none focus:ring-0 p-1 outline-none"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm text-slate-600 bg-transparent border-none focus:ring-0 p-1 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={onlyPriority}
              onChange={(e) => setOnlyPriority(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="text-sm text-slate-600 font-medium flex items-center gap-1">
              <AlertTriangle size={14} className={onlyPriority ? 'text-red-500' : 'text-slate-400'} />
              Apenas Urgentes
            </span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Nota Fiscal</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Motorista</th>
                <th className="p-4">Prioridade</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.map((d) => {
                const driver = getDriver(d.driverId);
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <button
                        onClick={() => setDetailDelivery(d)}
                        className="font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <FileText size={14} />
                        {d.invoiceNumber}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{d.customer.tradeName}</div>
                      <div className="text-xs text-slate-400 max-w-[200px] truncate flex items-center gap-1">
                        <MapPin size={10} /> {d.customer.location.address}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {driver ? (
                          <>
                            {driver.avatarUrl ? (
                              <img src={driver.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {driver.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-slate-700 font-medium">{driver.name}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Não atribuído</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {d.priority === 'URGENT' ? (
                        <span className="text-red-600 font-bold text-xs flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md w-fit">
                          <AlertTriangle size={12} /> ALTA
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-md w-fit">NORMAL</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-medium text-slate-800">
                      {formatCurrency(d.value)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={d.status} />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setDetailDelivery(d)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => setMapDelivery(d)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Ver no Mapa"
                        >
                          <MapPin size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium text-slate-500">Nenhuma entrega encontrada</p>
                      <p className="text-sm">Tente ajustar os filtros ou a busca.</p>
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