import React, { useState } from 'react';
import { Delivery, DeliveryStatus } from '../types';
import { X, CheckSquare, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ForceDeliveryModalProps {
    delivery: Delivery;
    onConfirm: (status: DeliveryStatus, reason?: string) => void;
    onClose: () => void;
    isLoading: boolean;
}

export const ForceDeliveryModal: React.FC<ForceDeliveryModalProps> = ({ delivery, onConfirm, onClose, isLoading }) => {
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
                            onClick={() => onConfirm('DELIVERED', reason)}
                            disabled={isLoading}
                            className="flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-200 transition-all disabled:opacity-50"
                        >
                            <CheckCircle2 size={24} />
                            <span className="font-bold text-sm">Confirmar Entrega</span>
                        </button>

                        <button
                            onClick={() => onConfirm('FAILED', reason)}
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
