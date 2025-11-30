import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Coffee, Play, Square, Pause, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Driver } from '../types';

interface JourneyHistoryModalProps {
    driver: Driver;
    onClose: () => void;
}

interface JourneyEvent {
    id: string;
    type: 'JOURNEY_START' | 'JOURNEY_END' | 'MEAL_START' | 'MEAL_END' | 'WAIT_START' | 'WAIT_END' | 'REST_START' | 'REST_END';
    timestamp: string;
    latitude?: number;
    longitude?: number;
    locationAddress?: string;
    notes?: string;
}

export const JourneyHistoryModal: React.FC<JourneyHistoryModalProps> = ({ driver, onClose }) => {
    const [events, setEvents] = useState<JourneyEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchHistory();
    }, [driver.id, date]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await api.journey.getHistory(driver.id, date);
            setEvents(data);
        } catch (error) {
            console.error("Failed to fetch journey history", error);
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'JOURNEY_START': return <Play size={16} className="text-green-600" />;
            case 'JOURNEY_END': return <Square size={16} className="text-red-600" />;
            case 'MEAL_START': return <Coffee size={16} className="text-orange-600" />;
            case 'MEAL_END': return <Play size={16} className="text-green-600" />;
            case 'WAIT_START': return <Pause size={16} className="text-yellow-600" />;
            case 'WAIT_END': return <Play size={16} className="text-green-600" />;
            case 'REST_START': return <Clock size={16} className="text-blue-600" />;
            case 'REST_END': return <Play size={16} className="text-green-600" />;
            default: return <AlertCircle size={16} className="text-slate-400" />;
        }
    };

    const getEventLabel = (type: string) => {
        switch (type) {
            case 'JOURNEY_START': return 'Início de Jornada';
            case 'JOURNEY_END': return 'Fim de Jornada';
            case 'MEAL_START': return 'Início Refeição';
            case 'MEAL_END': return 'Fim Refeição';
            case 'WAIT_START': return 'Início Espera';
            case 'WAIT_END': return 'Fim Espera';
            case 'REST_START': return 'Início Descanso';
            case 'REST_END': return 'Fim Descanso';
            default: return type;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-slate-50 rounded-t-xl">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Histórico de Jornada</h2>
                        <p className="text-sm text-slate-500">{driver.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                        <Calendar size={18} className="text-slate-500" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700"
                        />
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-slate-400">Carregando...</div>
                    ) : events.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-full text-slate-400">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p>Nenhum registro encontrado para esta data.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                            {events.map((event) => (
                                <div key={event.id} className="relative pl-8">
                                    {/* Dot */}
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                    </div>

                                    {/* Content */}
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 hover:shadow-sm transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                                {getEventIcon(event.type)}
                                                <span>{getEventLabel(event.type)}</span>
                                            </div>
                                            <div className="text-sm font-mono font-medium text-slate-500 bg-white px-2 py-1 rounded border">
                                                {new Date(event.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        {(event.locationAddress || (event.latitude && event.longitude)) && (
                                            <div className="flex items-start gap-2 text-xs text-slate-500 mt-2">
                                                <MapPin size={14} className="shrink-0 mt-0.5" />
                                                <span>
                                                    {event.locationAddress || `${event.latitude}, ${event.longitude}`}
                                                </span>
                                            </div>
                                        )}

                                        {event.notes && (
                                            <div className="mt-2 text-sm text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                                                "{event.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
