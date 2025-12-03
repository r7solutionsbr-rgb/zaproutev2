import React from 'react';
import { Shield, FileText, AlertCircle, CreditCard, Truck, Clock, Zap, ChevronRight } from 'lucide-react';
import { TenantConfig } from '../../types';

interface OperationSettingsProps {
    config: TenantConfig;
    updateConfig: (section: keyof TenantConfig, value: any) => void;
    updateNestedConfig: (section: keyof TenantConfig, key: string, value: any) => void;
}

export const OperationSettings: React.FC<OperationSettingsProps> = ({ config, updateConfig, updateNestedConfig }) => {
    return (
        <div className="space-y-6">
            {/* Import Strategy */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Estratégia de Importação de Motoristas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { value: 'CPF_ONLY', label: 'Apenas CPF', desc: 'Atualiza se o CPF existir. Mais permissivo.', icon: FileText },
                        { value: 'CPF_AND_NAME', label: 'CPF + Nome', desc: 'Exige match exato de CPF e Nome.', icon: Shield },
                        { value: 'STRICT', label: 'Estrita', desc: 'Rejeita duplicados. Mais seguro.', icon: Shield }
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => updateConfig('driverImportStrategy', opt.value)}
                            className={`p-6 rounded-xl border-2 text-left transition-all ${config.driverImportStrategy === opt.value
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <opt.icon size={24} className={`mb-3 ${config.driverImportStrategy === opt.value ? 'text-blue-600' : 'text-slate-400'}`} />
                            <div className={`font-bold mb-1 ${config.driverImportStrategy === opt.value ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</div>
                            <div className="text-xs text-slate-500 leading-relaxed">{opt.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Delivery Workflow */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Workflow de Entrega</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { value: 'SIMPLE', label: 'Simples', steps: ['Pendente', 'Entregue'] },
                        { value: 'STANDARD', label: 'Padrão', steps: ['Início', 'Chegada', 'Entrega'] },
                        { value: 'DETAILED', label: 'Detalhado', steps: ['Início', 'Chegada', 'Descarga', 'Fim'] }
                    ].map(wf => (
                        <button
                            key={wf.value}
                            onClick={() => updateConfig('deliveryWorkflow', wf.value)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${config.deliveryWorkflow === wf.value
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-slate-100 hover:border-slate-300'
                                }`}
                        >
                            <div className="font-bold text-slate-800 mb-2">{wf.label}</div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                {wf.steps.map((step, i) => (
                                    <React.Fragment key={step}>
                                        <span>{step}</span>
                                        {i < wf.steps.length - 1 && <ChevronRight size={10} />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Delivery Rules */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Validações e Restrições</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><FileText size={20} /></div>
                            <div>
                                <div className="font-bold text-slate-700">Exigir Comprovante</div>
                                <div className="text-xs text-slate-500">Motorista deve enviar foto para concluir.</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={config.displaySettings?.requireProofOfDelivery || false}
                                onChange={(e) => updateNestedConfig('displaySettings', 'requireProofOfDelivery', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600"><AlertCircle size={20} /></div>
                            <div>
                                <div className="font-bold text-slate-700">Permitir Entrega Parcial</div>
                                <div className="text-xs text-slate-500">Aceitar devolução de itens no ato.</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={config.displaySettings?.allowPartialDelivery || false}
                                onChange={(e) => updateNestedConfig('displaySettings', 'allowPartialDelivery', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Display Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">App do Motorista</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-green-600"><CreditCard size={20} /></div>
                            <div>
                                <div className="font-bold text-slate-700">Mostrar Valores (R$)</div>
                                <div className="text-xs text-slate-500">Exibir valor das notas fiscais no app.</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={config.displaySettings?.showValuesOnMobile || false}
                                onChange={(e) => updateNestedConfig('displaySettings', 'showValuesOnMobile', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600"><Truck size={20} /></div>
                            <div>
                                <div className="font-bold text-slate-700">Mostrar Volume</div>
                                <div className="text-xs text-slate-500">Exibir volume das entregas no app.</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={config.displaySettings?.showVolumeOnMobile || false}
                                onChange={(e) => updateNestedConfig('displaySettings', 'showVolumeOnMobile', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Journey Rules */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-800">Controle de Jornada</h3>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Lei do Motorista</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.enableJourneyControl ?? true}
                            onChange={(e) => updateConfig('enableJourneyControl', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className={`transition-opacity ${config.enableJourneyControl === false ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                        <p className="text-sm text-blue-800">
                            {config.enableJourneyControl === false
                                ? 'Controle de jornada desativado. Os motoristas não verão opções de registro de jornada no app.'
                                : 'Esses parâmetros afetam os alertas de descanso e tempo de direção no aplicativo. Certifique-se de estar em conformidade com a legislação vigente.'
                            }
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Max. Direção Contínua (min)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={config.journeyRules?.maxDrivingTime || 330}
                                    onChange={(e) => updateNestedConfig('journeyRules', 'maxDrivingTime', Number(e.target.value))}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10"
                                />
                                <Clock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Padrão: 330min (5h30)</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descanso Mínimo (min)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={config.journeyRules?.minRestTime || 30}
                                    onChange={(e) => updateNestedConfig('journeyRules', 'minRestTime', Number(e.target.value))}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10"
                                />
                                <Zap className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Padrão: 30min</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tempo de Almoço (min)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={config.journeyRules?.lunchTime || 60}
                                    onChange={(e) => updateNestedConfig('journeyRules', 'lunchTime', Number(e.target.value))}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10"
                                />
                                <CoffeeIcon className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Padrão: 60min (1h)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Icon helper
const CoffeeIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" x2="6" y1="2" y2="4" />
        <line x1="10" x2="10" y1="2" y2="4" />
        <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
);
