import React, { useState, useEffect, useRef } from 'react';
import { Delivery, DeliveryStatus } from '../types';
import {
  CheckCircle, XCircle, MapPin, Camera, Upload, ChevronLeft, Clock, Coffee,
  Play, Square, Pause, Navigation, Menu, X, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../services/api';

interface DriverAppProps {
  driverId: string;
  deliveries: Delivery[];
  updateDeliveryStatus: (id: string, status: DeliveryStatus, proof?: string) => void;
}

type JourneyStatus = 'JOURNEY_START' | 'JOURNEY_END' | 'MEAL_START' | 'MEAL_END' | 'WAIT_START' | 'WAIT_END' | 'REST_START' | 'REST_END' | null;

// --- COMPONENTS ---

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false
}: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl mb-4 sm:mb-0">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-300 mb-6">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-4 rounded-xl bg-slate-700 text-slate-200 font-bold hover:bg-slate-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`py-4 rounded-xl font-bold text-white transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const DriverApp: React.FC<DriverAppProps> = ({ driverId, deliveries, updateDeliveryStatus }) => {
  const [view, setView] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);

  // Journey State
  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus>(null);
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [showJourneyMenu, setShowJourneyMenu] = useState(false);

  // Confirmation State
  const [confirmAction, setConfirmAction] = useState<{
    type: 'JOURNEY' | 'DELIVERY' | 'FAIL';
    payload?: any;
    title: string;
    message: string;
  } | null>(null);

  const [tenantConfig, setTenantConfig] = useState<any>({});

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userStr = localStorage.getItem('zaproute_user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (user && user.tenantId) {
          const tenant = await api.tenants.getMe();
          setTenantConfig(tenant.config || {});

          const drivers = await api.drivers.getAll(user.tenantId);
          const me = drivers.find((d: any) => d.id === driverId);
          if (me) setJourneyStatus(me.currentJourneyStatus as JourneyStatus);
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    };
    fetchData();
  }, [driverId]);

  // --- ACTIONS ---

  const handleNavigate = (lat?: number, lng?: number) => {
    if (!lat || !lng) return alert("Localização não disponível");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleJourneyAction = async (type: JourneyStatus) => {
    if (!type) return;
    setLoadingJourney(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await api.journey.createEvent({
          driverId,
          type,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setJourneyStatus(type);
        setShowJourneyMenu(false);
      } catch (error: any) {
        alert(`Erro: ${error.message}`);
      } finally {
        setLoadingJourney(false);
        setConfirmAction(null);
      }
    }, () => {
      alert("Erro ao obter GPS.");
      setLoadingJourney(false);
      setConfirmAction(null);
    });
  };

  const handleCompleteDelivery = (status: DeliveryStatus) => {
    if (!selectedDelivery) return;

    // Validações
    if (status === 'DELIVERED' && tenantConfig.requireProofOfDelivery && !proofImage) {
      alert("⚠️ Foto do comprovante é obrigatória!");
      return;
    }

    updateDeliveryStatus(selectedDelivery.id, status, proofImage || undefined);
    setView('LIST');
    setSelectedDelivery(null);
    setConfirmAction(null);
  };

  // --- RENDER HELPERS ---

  const getJourneyStatusInfo = () => {
    switch (journeyStatus) {
      case 'JOURNEY_START':
      case 'MEAL_END':
      case 'WAIT_END':
      case 'REST_END':
        return { label: 'EM JORNADA', color: 'bg-green-500', text: 'text-green-400' };
      case 'MEAL_START': return { label: 'REFEIÇÃO', color: 'bg-orange-500', text: 'text-orange-400' };
      case 'WAIT_START': return { label: 'ESPERA', color: 'bg-yellow-500', text: 'text-yellow-400' };
      case 'REST_START': return { label: 'DESCANSO', color: 'bg-blue-500', text: 'text-blue-400' };
      default: return { label: 'OFFLINE', color: 'bg-slate-500', text: 'text-slate-400' };
    }
  };

  const journeyInfo = getJourneyStatusInfo();
  const isWorking = journeyInfo.label === 'EM JORNADA';
  const isOff = journeyInfo.label === 'OFFLINE';

  const myDeliveries = deliveries.filter(d => d.driverId === driverId);
  const activeDeliveries = myDeliveries.filter(d => ['PENDING', 'IN_TRANSIT'].includes(d.status));

  // --- CAMERA ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { url } = await api.storage.upload(file);
      setProofImage(url);
    } catch (err) {
      alert("Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  // --- VIEWS ---

  if (view === 'DETAIL' && selectedDelivery) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-safe">
        {/* Detail Header */}
        <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center gap-4">
          <button
            onClick={() => setView('LIST')}
            className="p-2 -ml-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-bold text-lg">Detalhes da Entrega</h1>
        </div>

        <div className="p-5 space-y-6">
          {/* Info Card */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</span>
              {selectedDelivery.priority === 'HIGH' && (
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded border border-red-500/30 flex items-center gap-1">
                  <AlertTriangle size={10} /> URGENTE
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{selectedDelivery.customer.tradeName}</h2>
            <p className="text-slate-400 text-sm mb-4">NF: {selectedDelivery.invoiceNumber}</p>

            <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <MapPin className="text-blue-400 shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-slate-200 leading-snug">{selectedDelivery.customer.location?.address}</p>
              </div>
            </div>

            <button
              onClick={() => handleNavigate(selectedDelivery.customer.location?.lat, selectedDelivery.customer.location?.lng)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Navigation size={18} /> Navegar (GPS)
            </button>
          </div>

          {/* Proof of Delivery */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
            <h3 className="font-bold text-slate-400 text-xs uppercase mb-4 flex items-center gap-2">
              <Camera size={14} /> Comprovante
            </h3>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {uploading ? (
              <div className="h-48 rounded-xl bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-700">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : proofImage ? (
              <div className="relative group">
                <img src={proofImage} alt="Proof" className="w-full h-64 object-cover rounded-xl border border-slate-700" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold flex items-center gap-2"
                  >
                    <Camera size={16} /> Refazer Foto
                  </button>
                </div>
                <button
                  onClick={() => setProofImage(null)}
                  className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 rounded-xl bg-slate-800 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-3 text-slate-400 hover:bg-slate-800/80 hover:border-blue-500/50 hover:text-blue-400 transition-all"
              >
                <div className="p-4 bg-slate-700 rounded-full">
                  <Camera size={32} />
                </div>
                <span className="font-medium">Tocar para fotografar</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 flex gap-3 pb-8">
          <button
            onClick={() => setConfirmAction({
              type: 'FAIL',
              title: 'Registrar Falha',
              message: 'Tem certeza que deseja registrar falha nesta entrega?',
            })}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <XCircle size={20} /> Falha
          </button>
          <button
            onClick={() => setConfirmAction({
              type: 'DELIVERY',
              title: 'Confirmar Entrega',
              message: 'Confirma a entrega para este cliente?',
            })}
            disabled={!proofImage && tenantConfig.requireProofOfDelivery}
            className={`flex-[2] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20 ${!proofImage && tenantConfig.requireProofOfDelivery
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
          >
            <CheckCircle size={20} /> Confirmar
          </button>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!confirmAction}
          title={confirmAction?.title}
          message={confirmAction?.message}
          isDestructive={confirmAction?.type === 'FAIL'}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction?.type === 'DELIVERY') handleCompleteDelivery('DELIVERED');
            if (confirmAction?.type === 'FAIL') handleCompleteDelivery('FAILED');
          }}
        />
      </div>
    );
  }

  // --- LIST VIEW ---
  const journeyEnabled = tenantConfig.enableJourneyControl ?? true;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Bar - Only show if journey control is enabled */}
      {journeyEnabled && (
        <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-lg">
          {/* Status Line */}
          <div className={`h-1 w-full ${journeyInfo.color}`} />

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${journeyInfo.color} animate-pulse`} />
              <div>
                <h1 className="font-bold text-sm text-slate-300">STATUS ATUAL</h1>
                <div className={`font-black text-lg ${journeyInfo.text}`}>{journeyInfo.label}</div>
              </div>
            </div>
            <button
              onClick={() => setShowJourneyMenu(!showJourneyMenu)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              {showJourneyMenu ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {/* Collapsible Journey Menu */}
          {showJourneyMenu && (
            <div className="bg-slate-800 border-b border-slate-700 p-4 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-3">
                {isOff ? (
                  <button
                    onClick={() => setConfirmAction({ type: 'JOURNEY', payload: 'JOURNEY_START', title: 'Iniciar Jornada', message: 'Deseja iniciar sua jornada de trabalho?' })}
                    className="col-span-2 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Play size={20} /> Iniciar Dia
                  </button>
                ) : (
                  <>
                    {isWorking && (
                      <>
                        <button onClick={() => handleJourneyAction('MEAL_START')} className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                          <Coffee size={18} /> Refeição
                        </button>
                        <button onClick={() => handleJourneyAction('WAIT_START')} className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                          <Pause size={18} /> Espera
                        </button>
                        <button onClick={() => handleJourneyAction('REST_START')} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                          <Clock size={18} /> Descanso
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'JOURNEY', payload: 'JOURNEY_END', title: 'Encerrar Jornada', message: 'Deseja finalizar seu dia de trabalho?' })}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                          <Square size={18} /> Encerrar
                        </button>
                      </>
                    )}
                    {!isWorking && (
                      <button
                        onClick={() => handleJourneyAction(journeyStatus === 'MEAL_START' ? 'MEAL_END' : journeyStatus === 'WAIT_START' ? 'WAIT_END' : 'REST_END')}
                        className="col-span-2 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        <Play size={20} /> Voltar ao Trabalho
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivery List */}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-xl font-bold text-white">Minhas Entregas</h2>
          <span className="text-slate-400 text-sm">{activeDeliveries.length} pendentes</span>
        </div>

        {activeDeliveries.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
            <p className="text-xl font-bold">Tudo pronto!</p>
            <p className="text-sm">Nenhuma entrega pendente.</p>
          </div>
        ) : (
          activeDeliveries.map((d, i) => (
            <div
              key={d.id}
              className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-lg active:scale-[0.98] transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700">
                    #{i + 1}
                  </span>
                  {d.priority === 'HIGH' && (
                    <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle size={12} /> URGENTE
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-slate-500">{d.volume}m³</span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{d.customer.tradeName}</h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">{d.customer.location?.address}</p>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <button
                  onClick={() => {
                    setSelectedDelivery(d);
                    setView('DETAIL');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl border border-slate-700 transition-colors"
                >
                  Detalhes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate(d.customer.location?.lat, d.customer.location?.lng);
                  }}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 p-3 rounded-xl transition-colors"
                  title="Navegar"
                >
                  <Navigation size={24} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal for Journey */}
      <ConfirmationModal
        isOpen={!!confirmAction && confirmAction.type === 'JOURNEY'}
        title={confirmAction?.title}
        message={confirmAction?.message}
        isDestructive={confirmAction?.payload === 'JOURNEY_END'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => handleJourneyAction(confirmAction?.payload)}
      />
    </div>
  );
};