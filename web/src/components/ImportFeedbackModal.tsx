import React from 'react';
import { CheckCircle, AlertCircle, Loader2, X, FileSpreadsheet } from 'lucide-react';

export interface ImportSummary {
    total: number;
    success: number;
    errors: number;
    errorDetails: string[];
}

interface ImportFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: 'PROCESSING' | 'COMPLETED';
    progress: number; // 0 to 100
    currentChunk: number;
    totalChunks: number;
    summary: ImportSummary;
}

export const ImportFeedbackModal: React.FC<ImportFeedbackModalProps> = ({
    isOpen,
    onClose,
    status,
    progress,
    currentChunk,
    totalChunks,
    summary
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">

                {/* HEADER */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${status === 'PROCESSING' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {status === 'PROCESSING' ? <Loader2 className="animate-spin" size={24} /> : <FileSpreadsheet size={24} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                {status === 'PROCESSING' ? 'Importando Clientes...' : 'Importação Concluída'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {status === 'PROCESSING' ? 'Por favor, não feche esta janela.' : 'Confira o resumo abaixo.'}
                            </p>
                        </div>
                    </div>
                    {status === 'COMPLETED' && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* BODY */}
                <div className="p-8 space-y-6">

                    {/* PROGRESS BAR */}
                    {status === 'PROCESSING' && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium text-slate-600">
                                <span>Processando lote {currentChunk} de {totalChunks}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-center text-xs text-slate-400 mt-2">Isso pode levar alguns instantes...</p>
                        </div>
                    )}

                    {/* SUMMARY STATS */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                            <span className="block text-2xl font-bold text-slate-800">{summary.total}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                            <span className="block text-2xl font-bold text-green-600">{summary.success}</span>
                            <span className="text-xs font-bold text-green-700 uppercase">Sucesso</span>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                            <span className="block text-2xl font-bold text-red-600">{summary.errors}</span>
                            <span className="text-xs font-bold text-red-700 uppercase">Erros</span>
                        </div>
                    </div>

                    {/* ERROR LIST */}
                    {summary.errors > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                                <AlertCircle size={16} /> Falhas ({summary.errors})
                            </h4>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-40 overflow-y-auto text-xs text-red-700 space-y-1 font-mono">
                                {summary.errorDetails.map((err, idx) => (
                                    <div key={idx} className="border-b border-red-100 last:border-0 pb-1 last:pb-0">
                                        • {err}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {status === 'COMPLETED' && summary.errors === 0 && (
                        <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100 text-green-700">
                            <CheckCircle className="mx-auto mb-2" size={32} />
                            <p className="font-bold">Tudo certo!</p>
                            <p className="text-sm">Todos os clientes foram importados com sucesso.</p>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                {status === 'COMPLETED' && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
