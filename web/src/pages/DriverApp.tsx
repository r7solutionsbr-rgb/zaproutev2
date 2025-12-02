import React, { useState, useEffect } from 'react';
import { Delivery, DeliveryStatus } from '../types';
import { Navigation, CheckCircle, XCircle, MapPin, Camera, Upload, ChevronLeft, Phone, Clock, Coffee, Play, Square, Pause } from 'lucide-react';
import { api } from '../services/api';

interface DriverAppProps {
  driverId: string;
  deliveries: Delivery[]; // Todas as entregas
  updateDeliveryStatus: (id: string, status: DeliveryStatus, proof?: string) => void;
}

type JourneyStatus = 'JOURNEY_START' | 'JOURNEY_END' | 'MEAL_START' | 'MEAL_END' | 'WAIT_START' | 'WAIT_END' | 'REST_START' | 'REST_END' | null;

export const DriverApp: React.FC<DriverAppProps> = ({ driverId, deliveries, updateDeliveryStatus }) => {
  const [view, setView] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);

  // Journey State
  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus>(null);
  const [loadingJourney, setLoadingJourney] = useState(false);

  const [tenantConfig, setTenantConfig] = useState<any>({});

  // Fetch initial journey status and config
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userStr = localStorage.getItem('zaproute_user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (user && user.tenantId) {
          // 1. Get Config
          const tenant = await api.tenants.getMe();
          setTenantConfig(tenant.config || {});

          // 2. Get Status
          const drivers = await api.drivers.getAll(user.tenantId);
          const me = drivers.find((d: any) => d.id === driverId);
          if (me) {
            setJourneyStatus(me.currentJourneyStatus as JourneyStatus);
          }
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    };
    fetchData();
  }, [driverId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleJourneyAction = async (type: JourneyStatus) => {
    if (!type) return;
    setLoadingJourney(true);

    // Get Geolocation
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await api.journey.createEvent({
          driverId,
          type,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setJourneyStatus(type);
        alert(`Status atualizado: ${type}`);
      } catch (error: any) {
        alert(`Erro ao atualizar jornada: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoadingJourney(false);
      }
    }, (error) => {
      alert("Erro ao obter localização. Permita o acesso ao GPS.");
      setLoadingJourney(false);
    });
  };

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
    if (!selectedDelivery) return;

    // 1. Validação de Comprovante
    if (status === 'DELIVERED' && tenantConfig.requireProofOfDelivery && !proofImage) {
      alert("⚠️ Foto obrigatória conforme regra da empresa.\nPor favor, tire uma foto do comprovante.");
      return;
    }

    // 2. Validação de Geofence
    if (status === 'DELIVERED' && tenantConfig.geofenceRadius && tenantConfig.geofenceRadius > 0) {
      if (!selectedDelivery.customer.location?.lat || !selectedDelivery.customer.location?.lng) {
        // Se cliente não tem GPS, permite (ou bloqueia, dependendo da rigidez. Aqui vamos permitir com aviso)
        console.warn("Cliente sem GPS cadastrado. Pulando validação de raio.");
      } else {
        navigator.geolocation.getCurrentPosition((position) => {
          const dist = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            selectedDelivery.customer.location.lat,
            selectedDelivery.customer.location.lng
          );

          if (dist > tenantConfig.geofenceRadius!) {
            alert(`🚫 Você está muito longe do local de entrega!\n\nDistância: ${Math.round(dist)}m\nPermitido: ${tenantConfig.geofenceRadius}m`);
            return;
          }

          // Se passou, finaliza
          updateDeliveryStatus(selectedDelivery.id, status, proofImage || undefined);
          setView('LIST');
          setSelectedDelivery(null);

        }, (error) => {
          alert("Erro ao validar localização. Verifique seu GPS.");
        });
        return; // Sai para esperar o callback do GPS
      }
    }

    // Se não tem geofence ou passou direto
    updateDeliveryStatus(selectedDelivery.id, status, proofImage || undefined);
    setView('LIST');
    setSelectedDelivery(null);
  };

  const handleWorkflowAction = async (action: 'ARRIVED' | 'START_UNLOADING' | 'END_UNLOADING') => {
    if (!selectedDelivery) return;

    const now = new Date().toISOString();
    const updates: any = {};

    if (action === 'ARRIVED') updates.arrivedAt = now;
    if (action === 'START_UNLOADING') updates.unloadingStartedAt = now;
    if (action === 'END_UNLOADING') updates.unloadingEndedAt = now;

    // Chama API com atualização parcial (mantém status PENDING/IN_TRANSIT)
    // Precisamos garantir que o status não mude para DELIVERED ainda
    // O backend aceita status, então mandamos o status ATUAL da entrega
    try {
      await api.routes.updateDeliveryStatus(
        selectedDelivery.id,
        selectedDelivery.status, // Mantém status atual
        undefined,
        undefined,
        updates // Novos campos
      );

      // Atualiza estado local
      setSelectedDelivery({ ...selectedDelivery, ...updates });

      // Atualiza lista global (opcional, mas bom pra consistência)
      // updateDeliveryStatus(selectedDelivery.id, selectedDelivery.status); // Isso pode ser confuso pois a prop updateDeliveryStatus do pai pode esperar mudança de status real.
      // Melhor apenas atualizar o selectedDelivery localmente por enquanto, pois o pai (App.tsx) recarrega dados periodicamente ou podemos forçar refresh.
      // Como DriverApp recebe `deliveries` como prop, idealmente deveríamos avisar o pai.
      // Mas para UX imediata, atualizar local state é suficiente.

    } catch (error) {
      console.error("Erro ao atualizar workflow", error);
      alert("Erro ao registrar etapa. Tente novamente.");
    }
  };

  // Simulação de Câmera
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleCamera = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { url } = await api.storage.upload(file);
      setProofImage(url);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Falha no upload da imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  // --- RENDER JOURNEY CONTROLS ---
  const renderJourneyControls = () => {
    const isWorking = journeyStatus === 'JOURNEY_START' || journeyStatus === 'MEAL_END' || journeyStatus === 'WAIT_END' || journeyStatus === 'REST_END';
    const isMeal = journeyStatus === 'MEAL_START';
    const isWait = journeyStatus === 'WAIT_START';
    const isRest = journeyStatus === 'REST_START';
    const isOff = !journeyStatus || journeyStatus === 'JOURNEY_END';

    if (loadingJourney) return <div className="p-4 text-center text-white">Atualizando...</div>;

    return (
      <div className="bg-slate-800 p-4 rounded-xl mb-6 border border-slate-700">
        <h3 className="text-slate-400 text-xs uppercase font-bold mb-3 flex items-center gap-2">
          <Clock size={14} /> Controle de Jornada
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {isOff && (
            <button onClick={() => handleJourneyAction('JOURNEY_START')} className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
              <Play size={18} /> Iniciar Jornada
            </button>
          )}

          {isWorking && (
            <>
              <button onClick={() => handleJourneyAction('MEAL_START')} className="bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <Coffee size={18} /> Refeição
              </button>
              <button onClick={() => handleJourneyAction('WAIT_START')} className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <Pause size={18} /> Espera
              </button>
              <button onClick={() => handleJourneyAction('REST_START')} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <Clock size={18} /> Descanso
              </button>
              <button onClick={() => handleJourneyAction('JOURNEY_END')} className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <Square size={18} /> Encerrar
              </button>
            </>
          )}

          {(isMeal || isWait || isRest) && (
            <button
              onClick={() => handleJourneyAction(isMeal ? 'MEAL_END' : isWait ? 'WAIT_END' : 'REST_END')}
              className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 animate-pulse"
            >
              <Play size={18} /> Retornar ao Trabalho
            </button>
          )}
        </div>

        <div className="mt-2 text-center">
          <span className="text-xs text-slate-500">
            Status Atual: <span className="text-white font-bold">
              {isOff ? 'Fora de Jornada' : isMeal ? 'Em Refeição' : isWait ? 'Em Espera' : isRest ? 'Em Descanso' : 'Em Jornada'}
            </span>
          </span>
        </div>
      </div>
    );
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

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {uploading ? (
              <div className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <span>Enviando foto...</span>
              </div>
            ) : !proofImage ? (
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
              {(() => {
                const workflow = tenantConfig.deliveryWorkflow || 'SIMPLE';
                const { arrivedAt, unloadingStartedAt, unloadingEndedAt } = selectedDelivery;

                // --- WORKFLOW: DETAILED ---
                if (workflow === 'DETAILED') {
                  if (!arrivedAt) {
                    return (
                      <button
                        onClick={() => handleWorkflowAction('ARRIVED')}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-700"
                      >
                        <MapPin /> Informar Chegada
                      </button>
                    );
                  }
                  if (!unloadingStartedAt) {
                    return (
                      <button
                        onClick={() => handleWorkflowAction('START_UNLOADING')}
                        className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-700"
                      >
                        <Upload /> Iniciar Descarga
                      </button>
                    );
                  }
                  if (!unloadingEndedAt) {
                    return (
                      <button
                        onClick={() => handleWorkflowAction('END_UNLOADING')}
                        className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-purple-700"
                      >
                        <CheckCircle /> Finalizar Descarga
                      </button>
                    );
                  }
                }

                // --- WORKFLOW: STANDARD ---
                if (workflow === 'STANDARD') {
                  if (!arrivedAt) {
                    return (
                      <button
                        onClick={() => handleWorkflowAction('ARRIVED')}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-700"
                      >
                        <MapPin /> Informar Chegada
                      </button>
                    );
                  }
                }

                // --- FINAL STEP (ALL WORKFLOWS) ---
                return (
                  <>
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
                  </>
                );
              })()}
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

        {renderJourneyControls()}

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