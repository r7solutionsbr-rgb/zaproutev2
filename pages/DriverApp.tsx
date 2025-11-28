import React, { useState } from 'react';
import { Delivery, DeliveryStatus } from '../types';
import { Navigation, CheckCircle, XCircle, MapPin, Camera, Upload, ChevronLeft, Phone } from 'lucide-react';

interface DriverAppProps {
  driverId: string;
  deliveries: Delivery[]; // Todas as entregas
  updateDeliveryStatus: (id: string, status: DeliveryStatus, proof?: string) => void;
}

export const DriverApp: React.FC<DriverAppProps> = ({ driverId, deliveries, updateDeliveryStatus }) => {
  const [view, setView] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);

  // Filtrar para este motorista
  const myDeliveries = deliveries.filter(d => d.driverId === driverId);
  const activeDeliveries = myDeliveries.filter(d => d.status !== 'DELIVERED' && d.status !== 'RETURNED' && d.status !== 'FAILED');
  const completedDeliveries = myDeliveries.filter(d => d.status === 'DELIVERED' || d.status === 'RETURNED' || d.status === 'FAILED');

  const handleSelect = (d: Delivery) => {
    setSelectedDelivery(d);
    setView('DETAIL');
    setProofImage(null);
  };

  const handleComplete = (status: DeliveryStatus) => {
    if (selectedDelivery) {
      updateDeliveryStatus(selectedDelivery.id, status, proofImage || undefined);
      setView('LIST');
      setSelectedDelivery(null);
    }
  };

  // Simulação de Câmera
  const handleCamera = () => {
    // Num PWA real, acederíamos ao navigator.mediaDevices
    setProofImage('https://picsum.photos/400/300'); // Imagem mockada
  };

  if (view === 'DETAIL' && selectedDelivery) {
    return (
      <div className="min-h-screen bg-white pb-20">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 flex items-center gap-4">
          <button onClick={() => setView('LIST')}><ChevronLeft /></button>
          <h1 className="text-lg font-bold">Detalhes da Entrega</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg flex items-center gap-3 ${selectedDelivery.priority === 'URGENT' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            <div className="font-bold">{selectedDelivery.status}</div>
            {selectedDelivery.priority === 'URGENT' && <div className="text-xs bg-red-200 px-2 py-1 rounded">URGENTE</div>}
          </div>

          {/* Customer Info */}
          <div>
            <h2 className="text-slate-500 text-sm uppercase font-bold mb-2">Cliente</h2>
            <p className="text-xl font-bold text-slate-800">{selectedDelivery.customer.tradeName}</p>
            <p className="text-slate-600 mt-1">{selectedDelivery.customer.location.address}</p>
            <div className="mt-4 flex gap-3">
              <button className="flex-1 py-3 bg-slate-100 rounded-lg flex items-center justify-center gap-2 text-slate-700 font-medium">
                <Navigation size={18} /> Navegar
              </button>
              <button className="flex-1 py-3 bg-slate-100 rounded-lg flex items-center justify-center gap-2 text-slate-700 font-medium">
                <Phone size={18} /> Ligar
              </button>
            </div>
          </div>

          {/* Order Info */}
          <div className="border-t pt-4">
            <h2 className="text-slate-500 text-sm uppercase font-bold mb-2">Info do Pedido</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="block text-xs text-slate-400">Nota Fiscal</span>
                <span className="font-mono font-medium">{selectedDelivery.invoiceNumber}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="block text-xs text-slate-400">Volume</span>
                <span className="font-medium">{selectedDelivery.volume} m³</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-4">
            <h2 className="text-slate-500 text-sm uppercase font-bold mb-4">Comprovante de Entrega</h2>
            
            {!proofImage ? (
              <button onClick={handleCamera} className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-blue-400 transition-colors">
                <Camera size={32} className="mb-2" />
                <span>Toque para tirar foto</span>
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden mb-4">
                <img src={proofImage} alt="Proof" className="w-full h-48 object-cover" />
                <button onClick={() => setProofImage(null)} className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-slate-800">
                  <XCircle />
                </button>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3">
              <button 
                onClick={() => handleComplete(DeliveryStatus.DELIVERED)}
                disabled={!proofImage}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 ${proofImage ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}`}
              >
                <CheckCircle /> Confirmar Entrega
              </button>
              
              <button 
                 onClick={() => handleComplete(DeliveryStatus.FAILED)}
                className="w-full py-4 bg-red-100 text-red-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                <XCircle /> Relatar Problema / Falha
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 pb-12 rounded-b-[2rem]">
        <div className="flex justify-between items-start mb-4">
           <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 overflow-hidden">
               <img src={`https://ui-avatars.com/api/?name=Driver&background=random`} alt="Driver" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Olá, Motorista</h1>
              <p className="text-xs text-slate-400">ID: {driverId}</p>
            </div>
           </div>
           <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/50">ONLINE</div>
        </div>
        <div className="flex justify-between text-center">
          <div>
            <div className="text-2xl font-bold">{myDeliveries.length}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{activeDeliveries.length}</div>
            <div className="text-xs text-slate-400">Restante</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{completedDeliveries.length}</div>
            <div className="text-xs text-slate-400">Feito</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 -mt-6 space-y-4">
        {activeDeliveries.map((d, i) => (
          <div key={d.id} onClick={() => handleSelect(d)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">#{i + 1}</span>
              <span className="text-xs text-slate-400">{d.volume}m³</span>
            </div>
            <h3 className="font-bold text-slate-800">{d.customer.tradeName}</h3>
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
              <MapPin size={14} />
              <span className="truncate">{d.customer.location.address}</span>
            </div>
            {d.priority === 'URGENT' && (
              <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
                 <span className="text-xs text-red-600 font-bold flex items-center gap-1"><Upload size={12} /> Alta Prioridade</span>
              </div>
            )}
          </div>
        ))}

        {activeDeliveries.length === 0 && (
             <div className="text-center py-12 text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
                <p>Você terminou tudo por hoje!</p>
             </div>
        )}
      </div>
    </div>
  );
};