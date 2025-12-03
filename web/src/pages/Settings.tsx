import React, { useState, useEffect } from 'react';
import {
  Save, Building, Shield, MessageSquare,
  Settings as SettingsIcon, Loader2, AlertCircle, CheckCircle, ChevronRight, Users
} from 'lucide-react';
import { api } from '../services/api';
import { Tenant, TenantConfig } from '../types';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { IntegrationSettings } from '../components/settings/IntegrationSettings';
import { OperationSettings } from '../components/settings/OperationSettings';
import { UserSettings } from '../components/settings/UserSettings';

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
    { id: 'USERS', label: 'Usuários e Equipe', icon: Users, description: 'Gerencie o acesso ao sistema' },
    { id: 'INTEGRATION', label: 'Integração WhatsApp', icon: MessageSquare, description: 'Bot e mensagens automáticas' },
    { id: 'OPERATION', label: 'Operação', icon: Shield, description: 'Regras, workflows e jornada' },
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
            {activeSection !== 'USERS' && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Salvar Alterações
              </button>
            )}
          </div>

          {notification && (
            <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
              }`}>
              {notification.type === 'SUCCESS' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              <div>
                <p className="font-bold">{notification.message}</p>
              </div>
            </div>
          )}

          {/* CONTEÚDO DINÂMICO */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeSection === 'GENERAL' && <GeneralSettings tenant={tenant} />}
            {activeSection === 'USERS' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <UserSettings />
              </div>
            )}
            {activeSection === 'INTEGRATION' && <IntegrationSettings config={config} updateNestedConfig={updateNestedConfig} />}
            {activeSection === 'OPERATION' && <OperationSettings config={config} updateConfig={updateConfig} updateNestedConfig={updateNestedConfig} />}
          </div>
        </div>
      </main>
    </div>
  );
};