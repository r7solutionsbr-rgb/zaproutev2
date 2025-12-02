import React, { useState, useEffect } from 'react';
import { Save, Building, CreditCard, Users, Settings as SettingsIcon, Bell, Shield, Smartphone, Truck, MessageSquare, Database, Layout, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Tenant, TenantConfig } from '../types';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('PREFERENCES');
  const [isLoading, setIsLoading] = useState(false);
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
        // Aqui você deve ter um endpoint para pegar o Tenant atual
        // Se não tiver, pode pegar do user.tenant se vier populado
        // Por enquanto, vamos simular ou pegar de um endpoint hipotético
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
    setIsLoading(true);
    try {
      await api.tenants.updateConfig(tenant.id, config);
      setNotification({ type: 'SUCCESS', message: 'Configurações salvas com sucesso!' });
      // Atualiza localmente
      setTenant({ ...tenant, config });
    } catch (error) {
      console.error(error);
      setNotification({ type: 'ERROR', message: 'Erro ao salvar configurações.' });
    } finally {
      setIsLoading(false);
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
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <SettingsIcon className="text-blue-600" /> Configurações
          </h1>
          <p className="text-slate-500 mt-1">Gerencie as preferências da sua empresa ({tenant?.name})</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Salvar Alterações
        </button>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <div className="font-bold">{notification.message}</div>
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'PREFERENCES', label: 'Preferências', icon: Layout },
          { id: 'COMPANY', label: 'Empresa', icon: Building },
          { id: 'BILLING', label: 'Faturamento', icon: CreditCard },
          { id: 'TEAM', label: 'Equipe', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'PREFERENCES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. IMPORTAÇÃO E DADOS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Database className="text-blue-500" size={20} /> Importação de Dados
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Estratégia de Importação de Motoristas</label>
                <select
                  value={config.driverImportStrategy || 'CPF_ONLY'}
                  onChange={(e) => updateConfig('driverImportStrategy', e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50"
                >
                  <option value="CPF_ONLY">Apenas CPF (Atualiza se existir)</option>
                  <option value="CPF_AND_NAME">CPF + Nome (Validação Dupla)</option>
                  <option value="STRICT">Estrita (Rejeita duplicados)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Define como o sistema lida com motoristas já cadastrados durante importações em massa.</p>
              </div>
            </div>
          </div>

          {/* 2. REGRAS DE NEGÓCIO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="text-purple-500" size={20} /> Regras de Negócio
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Workflow de Entrega</label>
                <select
                  value={config.deliveryWorkflow || 'STANDARD'}
                  onChange={(e) => updateConfig('deliveryWorkflow', e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50"
                >
                  <option value="SIMPLE">Simples (Pendente -> Entregue)</option>
                  <option value="STANDARD">Padrão (Início -> Chegada -> Entrega)</option>
                  <option value="DETAILED">Detalhado (Início -> Chegada -> Descarga -> Fim)</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Exigir Comprovante (Foto)</span>
                <input
                  type="checkbox"
                  checked={config.displaySettings?.requireProofOfDelivery || false}
                  onChange={(e) => updateNestedConfig('displaySettings', 'requireProofOfDelivery', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Permitir Entrega Parcial</span>
                <input
                  type="checkbox"
                  checked={config.displaySettings?.allowPartialDelivery || false}
                  onChange={(e) => updateNestedConfig('displaySettings', 'allowPartialDelivery', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. INTEGRAÇÃO WHATSAPP (BOT) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="text-green-500" size={20} /> Integração WhatsApp (Bot)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Provedor</label>
                  <select
                    value={config.whatsappProvider?.type || 'ZAPI'}
                    onChange={(e) => updateNestedConfig('whatsappProvider', 'type', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    <option value="ZAPI">Z-API (QR Code)</option>
                    <option value="SENDPULSE">SendPulse (Oficial API)</option>
                  </select>
                </div>

                {config.whatsappProvider?.type === 'ZAPI' ? (
                  <>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase">Instance ID</label><input type="text" value={config.whatsappProvider?.zapiInstanceId || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'zapiInstanceId', e.target.value)} className="w-full p-2 border rounded" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase">Token</label><input type="password" value={config.whatsappProvider?.zapiToken || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'zapiToken', e.target.value)} className="w-full p-2 border rounded" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase">Client Token</label><input type="password" value={config.whatsappProvider?.zapiClientToken || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'zapiClientToken', e.target.value)} className="w-full p-2 border rounded" /></div>
                  </>
                ) : (
                  <>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase">Client ID</label><input type="text" value={config.whatsappProvider?.sendpulseClientId || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'sendpulseClientId', e.target.value)} className="w-full p-2 border rounded" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase">Client Secret</label><input type="password" value={config.whatsappProvider?.sendpulseClientSecret || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'sendpulseClientSecret', e.target.value)} className="w-full p-2 border rounded" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase">Bot ID (Template)</label><input type="text" value={config.whatsappProvider?.sendpulseBotId || ''} onChange={(e) => updateNestedConfig('whatsappProvider', 'sendpulseBotId', e.target.value)} className="w-full p-2 border rounded" placeholder="Obrigatório para Templates" /></div>
                  </>
                )}
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 border-b pb-2">Templates de Mensagem</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Boas-vindas (Nome do Template)</label>
                  <input type="text" value={config.whatsappTemplates?.welcome || ''} onChange={(e) => updateNestedConfig('whatsappTemplates', 'welcome', e.target.value)} className="w-full p-2 border rounded" placeholder="Ex: welcome_driver" />
                  <p className="text-[10px] text-slate-400">Usado ao cadastrar motorista. SendPulse exige template aprovado.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Saudação Diária</label>
                  <textarea rows={2} value={config.whatsappTemplates?.greeting || ''} onChange={(e) => updateNestedConfig('whatsappTemplates', 'greeting', e.target.value)} className="w-full p-2 border rounded" placeholder="Olá {motorista}, sua rota está pronta..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sucesso na Entrega</label>
                  <textarea rows={2} value={config.whatsappTemplates?.success || ''} onChange={(e) => updateNestedConfig('whatsappTemplates', 'success', e.target.value)} className="w-full p-2 border rounded" placeholder="Entrega {nf} realizada com sucesso!" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. VISUALIZAÇÃO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Smartphone className="text-orange-500" size={20} /> App do Motorista
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Mostrar Valores (R$)</span>
                <input
                  type="checkbox"
                  checked={config.displaySettings?.showValuesOnMobile || false}
                  onChange={(e) => updateNestedConfig('displaySettings', 'showValuesOnMobile', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 5. JORNADA */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="text-red-500" size={20} /> Jornada de Trabalho
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max. Direção (min)</label>
                <input type="number" value={config.journeyRules?.maxDrivingTime || 330} onChange={(e) => updateNestedConfig('journeyRules', 'maxDrivingTime', Number(e.target.value))} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descanso Min. (min)</label>
                <input type="number" value={config.journeyRules?.minRestTime || 30} onChange={(e) => updateNestedConfig('journeyRules', 'minRestTime', Number(e.target.value))} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Almoço (min)</label>
                <input type="number" value={config.journeyRules?.lunchTime || 60} onChange={(e) => updateNestedConfig('journeyRules', 'lunchTime', Number(e.target.value))} className="w-full p-2 border rounded" />
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'COMPANY' && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500">
          <Building size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">Dados da Empresa</h3>
          <p>Em breve você poderá editar CNPJ, Endereço e Logo aqui.</p>
        </div>
      )}
    </div>
  );
};