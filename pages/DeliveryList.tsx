import React, { useState } from 'react';
import { Delivery, Driver, DeliveryStatus } from '../types';
import { Package, User, MapPin, DollarSign, Calendar, ArrowLeft, CheckCircle, XCircle, Truck, FileText, AlertTriangle } from 'lucide-react';

interface DeliveryListProps {
  deliveries: Delivery[];
  drivers: Driver[];
}

export const DeliveryList: React.FC<DeliveryListProps> = ({ deliveries, drivers }) => {
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Não atribuído';
    return drivers.find(d => d.id === driverId)?.name || 'Desconhecido';
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED: return 'bg-green-100 text-green-700';
      case DeliveryStatus.PENDING: return 'bg-slate-100 text-slate-500';
      case DeliveryStatus.IN_TRANSIT: return 'bg-blue-100 text-blue-700';
      case DeliveryStatus.FAILED: return 'bg-red-100 text-red-700';
      case DeliveryStatus.RETURNED: return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getStatusLabel = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED: return 'ENTREGUE';
      case DeliveryStatus.PENDING: return 'PENDENTE';
      case DeliveryStatus.IN_TRANSIT: return 'EM ROTA';
      case DeliveryStatus.FAILED: return 'FALHA';
      case DeliveryStatus.RETURNED: return 'DEVOLVIDO';
      default: return status;
    }
  };

  // --- VIEW: DETAIL ---
  if (selectedDeliveryId) {
    const delivery = deliveries.find(d => d.id === selectedDeliveryId);
    if (!delivery) return <div>Entrega não encontrada</div>;

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <button 
          onClick={() => setSelectedDeliveryId(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Voltar para Lista de Entregas
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                {delivery.customer.tradeName}
                            </h1>
                            <p className="text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin size={16} /> {delivery.customer.location.address}
                            </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(delivery.status)}`}>
                            {getStatusLabel(delivery.status)}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4 mt-2">
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-bold">Nota Fiscal</span>
                            <p className="font-mono font-medium text-slate-700">{delivery.invoiceNumber}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-bold">Valor</span>
                            <p className="font-medium text-slate-700">{formatCurrency(delivery.value)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-bold">Volume</span>
                            <p className="font-medium text-slate-700">{delivery.volume} m³</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-bold">Peso</span>
                            <p className="font-medium text-slate-700">{delivery.weight} kg</p>
                        </div>
                    </div>
                </div>

                {/* Timeline / History (Mock) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Calendar size={18} /> Histórico do Pedido
                    </h3>
                    <div className="space-y-6 pl-2 border-l-2 border-slate-100 ml-2">
                        <div className="relative pl-6">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                            <p className="text-sm font-bold text-slate-800">Pedido Criado / Importado</p>
                            <p className="text-xs text-slate-500">Hoje, 06:00</p>
                        </div>
                        {delivery.routeId && (
                            <div className="relative pl-6">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                                <p className="text-sm font-bold text-slate-800">Roteirizado</p>
                                <p className="text-xs text-slate-500">Rota: {delivery.routeId} - Hoje, 07:15</p>
                            </div>
                        )}
                        {(delivery.status === 'DELIVERED' || delivery.status === 'FAILED') && (
                            <div className="relative pl-6">
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${delivery.status === 'DELIVERED' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                <p className="text-sm font-bold text-slate-800">
                                    {delivery.status === 'DELIVERED' ? 'Entrega Realizada' : 'Tentativa Falhou'}
                                </p>
                                <p className="text-xs text-slate-500">Hoje, 14:30</p>
                                {delivery.failureReason && (
                                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1 inline-block">
                                        Motivo: {delivery.failureReason}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Truck size={18} /> Transporte
                    </h3>
                    <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="text-slate-500" />
                         </div>
                         <div>
                             <p className="text-sm font-bold text-slate-800">{getDriverName(delivery.driverId)}</p>
                             <p className="text-xs text-slate-500">Motorista Responsável</p>
                         </div>
                    </div>
                    {delivery.priority === 'URGENT' && (
                        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                            <AlertTriangle size={16} /> ENTREGA URGENTE
                        </div>
                    )}
                 </div>

                 {delivery.proofOfDelivery && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <FileText size={18} /> Comprovante
                        </h3>
                        <div className="rounded-lg overflow-hidden border border-slate-200">
                            <img src={delivery.proofOfDelivery} alt="Comprovante" className="w-full h-48 object-cover" />
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-2">Assinado digitalmente</p>
                    </div>
                 )}
            </div>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Package className="text-blue-600" /> Gestão de Entregas
          </h1>
          <p className="text-slate-500 mt-1">Visualize todas as notas fiscais e status de entrega.</p>
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
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                     <button 
                        onClick={() => setSelectedDeliveryId(d.id)}
                        className="font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline"
                     >
                        {d.invoiceNumber}
                     </button>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{d.customer.tradeName}</div>
                    <div className="text-xs text-slate-400 max-w-[200px] truncate">{d.customer.location.address}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                        {d.driverId ? (
                             <>
                                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                    {getDriverName(d.driverId).charAt(0)}
                                </div>
                                <span className="text-slate-600">{getDriverName(d.driverId)}</span>
                             </>
                        ) : (
                            <span className="text-slate-400 italic">--</span>
                        )}
                    </div>
                  </td>
                  <td className="p-4">
                    {d.priority === 'URGENT' ? (
                        <span className="text-red-600 font-bold text-xs flex items-center gap-1"><AlertTriangle size={12}/> ALTA</span>
                    ) : (
                        <span className="text-slate-500 text-xs">NORMAL</span>
                    )}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatCurrency(d.value)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(d.status)}`}>
                        {getStatusLabel(d.status)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                     <button 
                        onClick={() => setSelectedDeliveryId(d.id)}
                        className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                        Ver Detalhes
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};