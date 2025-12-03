import React, { useState, useEffect } from 'react';
import {
  Save, Building, CreditCard, Users, Settings as SettingsIcon,
  Bell, Shield, Smartphone, Truck, MessageSquare, Database,
  Layout, Clock, AlertCircle, CheckCircle, Loader2,
  MapPin, FileText, Zap, ChevronRight, MessageCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Tenant, TenantConfig } from '../types';

export const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('GENERAL');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<TenantConfig>({});
  const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('zaproute_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const tenantData = await api.tenants.getById(user.tenantId);
        setTenant(tenantData);
        setConfig(tenantData.config || {});
      }
    } catch (error) {
      console.error("Erro ao carregar configurações", error);
      setNotification({ type: 'ERROR', message: 'Falha ao carregar configurações.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant) return;
    setIsSaving(true);
    setNotification(null);
    try {
      // Usando updateConfig conforme api.ts existente, ou updateMe se preferir
      await api.tenants.updateConfig(tenant.id, config);
      setNotification({ type: 'SUCCESS', message: 'Configurações salvas com sucesso!' });
      setTenant({ ...tenant, config });

      // Auto-hide notification
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'ERROR', message: 'Erro ao salvar configurações.' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (section: keyof TenantConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const updateNestedConfig = (section: keyof TenantConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any || {}),
        [key]: value
      }
    }));
  };

  if (isLoading && !tenant) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-500 font-medium">Carregando central de controle...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'GENERAL', label: 'Geral', icon: Building, description: 'Dados da empresa e plano' },
    { id: 'IMPORT', label: 'Importação', icon: Database, description: 'Regras de entrada de dados' },
    { id: 'RULES', label: 'Regras de Entrega', icon: Shield, description: 'Workflows e validações' },
    { id: 'WHATSAPP', label: 'Bot WhatsApp', icon: MessageSquare, description: 'Integração e mensagens' },
    { id: 'DISPLAY', label: 'Visualização', icon: Smartphone, description: 'App do motorista' },
    { id: 'JOURNEY', label: 'Jornada', icon: Clock, description: 'Lei do Motorista' },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="text-blue-600" size={24} />
            Configurações
          </h1>
          <p className="text-xs text-slate-500 mt-1">Central de Controle</p>
        </div>
        <nav className="p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeSection === item.id
                ? 'bg-blue-50 text-blue-700 font-bold shadow-sm ring-1 ring-blue-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <item.icon size={20} className={activeSection === item.id ? 'text-blue-600' : 'text-slate-400'} />
              <div>
                <div className="text-sm">{item.label}</div>
              </div>
              {activeSection === item.id && <ChevronRight size={16} className="ml-auto text-blue-400" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">

          {/* HEADER DA SEÇÃO */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                {menuItems.find(i => i.id === activeSection)?.icon &&
                  React.createElement(menuItems.find(i => i.id === activeSection)!.icon, { size: 32, className: 'text-slate-400' })
                }
                {menuItems.find(i => i.id === activeSection)?.label}
              </h2>
              <p className="text-slate-500 mt-1 text-lg">{menuItems.find(i => i.id === activeSection)?.description}</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Alterações
            </button>
          </div>

          {notification && (
            <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {notification.type === 'SUCCESS' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              <div>
                <p className="font-bold">{notification.message}</p>
              </div>
            </div>
          )}

          {/* CONTEÚDO DINÂMICO */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* --- GERAL --- */}
            {activeSection === 'GENERAL' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Building size={48} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{tenant?.name}</h3>
                <p className="text-slate-500 mb-6 font-mono text-sm bg-slate-50 inline-block px-3 py-1 rounded-full mt-2 border border-slate-100">
                  ID: {tenant?.id}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase">Plano</label>
                    <div className="font-bold text-slate-700">{tenant?.plan || 'Free'}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                    <div className="font-bold text-green-600 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {tenant?.status}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase">Criado em</label>
                    <div className="font-bold text-slate-700">{new Date(tenant?.createdAt || '').toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* --- IMPORTAÇÃO --- */}
            {activeSection === 'IMPORT' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Estratégia de Importação de Motoristas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'CPF_ONLY', label: 'Apenas CPF', desc: 'Atualiza se o CPF existir. Mais permissivo.', icon: FileText },
                    { value: 'CPF_AND_NAME', label: 'CPF + Nome', desc: 'Exige match exato de CPF e Nome.', icon: Users },
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
            )}

            {/* --- REGRAS DE ENTREGA --- */}
            {activeSection === 'RULES' && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* --- WHATSAPP --- */}
            {activeSection === 'WHATSAPP' && (
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Provedor de Mensagens</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => updateNestedConfig('whatsappProvider', 'type', 'ZAPI')}
                      className={`p-6 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${config.whatsappProvider?.type === 'ZAPI'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">Z</div>
                      <div>
                        <div className="font-bold text-slate-800">Z-API</div>
                        <div className="text-xs text-slate-500">Conexão via QR Code. Simples e direto.</div>
                      </div>
                      {config.whatsappProvider?.type === 'ZAPI' && <CheckCircle className="ml-auto text-green-600" />}
                    </button>

                    <button
                      onClick={() => updateNestedConfig('whatsappProvider', 'type', 'SENDPULSE')}
                      className={`p-6 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${config.whatsappProvider?.type === 'SENDPULSE'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">S</div>
                      <div>
                        <div className="font-bold text-slate-800">SendPulse</div>
                        <div className="text-xs text-slate-500">API Oficial. Requer aprovação de templates.</div>
                      </div>
                      {config.whatsappProvider?.type === 'SENDPULSE' && <CheckCircle className="ml-auto text-blue-600" />}
                    </button>
                  </div>

                  <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-100">
                    {config.whatsappProvider?.type === 'ZAPI' ? (
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-700">Credenciais Z-API</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instance ID</label><input type="text" value={config.whatsappProvider?.zapiInstanceId || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'zapiInstanceId', e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: 3B2..." /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Token</label><input type="password" value={config.whatsappProvider?.zapiToken || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'zapiToken', e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Token</label><input type="password" value={config.whatsappProvider?.zapiClientToken || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'zapiClientToken', e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-700">Credenciais SendPulse</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID</label><input type="text" value={config.whatsappProvider?.sendpulseClientId || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'sendpulseClientId', e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Secret</label><input type="password" value={config.whatsappProvider?.sendpulseClientSecret || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'sendpulseClientSecret', e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bot ID (Template)</label><input type="text" value={config.whatsappProvider?.sendpulseBotId || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'sendpulseBotId', e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Obrigatório para envio de templates" /></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Templates e Preview</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Saudação Diária</label>
                        <textarea
                          rows={4}
                          value={config.whatsappTemplates?.greeting || ''}
                          onChange={(e) => updateNestedConfig('whatsappTemplates', 'greeting', e.target.value)}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          placeholder="Olá {motorista}, sua rota está pronta..."
                        />
                        <p className="text-xs text-slate-400 mt-1">Variáveis: {'{motorista}'}, {'{rota}'}, {'{entregas}'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sucesso na Entrega</label>
                        <textarea
                          rows={4}
                          value={config.whatsappTemplates?.success || ''}
                          onChange={(e) => updateNestedConfig('whatsappTemplates', 'success', e.target.value)}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          placeholder="Entrega {nf} realizada com sucesso!"
                        />
                        <p className="text-xs text-slate-400 mt-1">Variáveis: {'{nf}'}, {'{cliente}'}</p>
                      </div>
                    </div>

                    {/* PREVIEW */}
                    <div className="bg-[#E5DDD5] p-6 rounded-xl border border-slate-200 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-black/10"></div>
                      <div className="flex flex-col gap-4">
                        <div className="self-start bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] relative">
                          <div className="text-xs font-bold text-[#075E54] mb-1">Bot ZapRoute</div>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">
                            {(config.whatsappTemplates?.greeting || 'Olá Motorista...').replace('{motorista}', 'João Silva').replace('{rota}', 'R-123').replace('{entregas}', '15')}
                          </p>
                          <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                            10:30 <CheckCircle size={10} className="text-blue-400" />
                          </div>
                        </div>

                        <div className="self-end bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%]">
                          <p className="text-sm text-slate-800">Entendido, iniciando rota!</p>
                          <div className="text-[10px] text-slate-500 text-right mt-1 flex items-center justify-end gap-1">
                            10:31 <CheckCircle size={10} className="text-blue-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- VISUALIZAÇÃO --- */}
            {activeSection === 'DISPLAY' && (
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
            )}

            {/* --- JORNADA --- */}
            {activeSection === 'JOURNEY' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Parâmetros da Lei do Motorista</h3>
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Legal</span>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-start gap-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <p className="text-sm text-blue-800">
                    Esses parâmetros afetam os alertas de descanso e tempo de direção no aplicativo.
                    Certifique-se de estar em conformidade com a legislação vigente.
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
            )}

          </div>
        </div>
      </main>
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