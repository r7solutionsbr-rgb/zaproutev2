import React, { useState, useEffect, useRef } from 'react';
import { Route, Delivery } from '../types';
import { Map as MapIcon, X, MapPin, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface RouteMapModalProps {
    route: Route;
    deliveries: Delivery[];
    onClose: () => void;
    focusDeliveryId?: string | null;
}

export const RouteMapModal: React.FC<RouteMapModalProps> = ({ route, deliveries, onClose, focusDeliveryId }) => {
    const [mapReady, setMapReady] = useState(false);
    const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

    // Filtra as entregas desta rota
    const routeDeliveries = deliveries.filter(d => route.deliveries.includes(d.id));

    // Extrai pontos válidos (lat/lng)
    const points = routeDeliveries
        .filter(d => d.customer.location && d.customer.location.lat && d.customer.location.lng)
        .map(d => ({
            id: d.id,
            lat: d.customer.location!.lat,
            lng: d.customer.location!.lng,
            status: d.status,
            customerName: d.customer.tradeName,
            invoiceNumber: d.invoiceNumber,
            address: d.customer.location!.address,
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
                                        p.status === 'DELIVERED' ? icons.green :
                                            p.status === 'FAILED' || p.status === 'RETURNED' ? icons.red :
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
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value || 0)}</span>
                                                </div>
                                            </div>

                                            {/* Rodapé Status */}
                                            <div className="flex items-center justify-between mt-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                    p.status === 'FAILED' || p.status === 'RETURNED' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {p.status === 'DELIVERED' ? 'ENTREGUE' :
                                                        p.status === 'FAILED' ? 'FALHA' :
                                                            p.status === 'RETURNED' ? 'DEVOLVIDO' :
                                                                p.status === 'IN_TRANSIT' ? 'EM ROTA' : 'PENDENTE'}
                                                </span>

                                                {(p.status === 'DELIVERED' || p.status === 'FAILED' || p.status === 'RETURNED') && p.updatedAt && (
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
