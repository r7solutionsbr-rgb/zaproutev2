import React, { useState, useEffect, useRef } from 'react';
import { Building, Users, Save, Shield, Plus, Trash2, Check, X, CheckCircle, AlertCircle, Upload, Image as ImageIcon, Edit, Sliders, FileText, MapPin, Camera, MessageSquare, Eye } from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'TEAM' | 'PREFERENCES'>('PROFILE');
  const [isLoading, setIsLoading] = useState(false);

  // --- DADOS DA EMPRESA (TENANT) ---
  const [tenant, setTenant] = useState<any>({});
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --- DADOS DA EQUIPE (USERS) ---
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Estado para controlar Edição vs Criação
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState({ name: '', email: '', password: '', role: 'DISPATCHER' });

  // Notificação Global
  const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);

  // Auto-dismiss da notificação
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Carregar Dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const tenantData = await api.tenants.getMe();
      setTenant(tenantData);
      const usersData = await api.users.getAll();
      setTeamMembers(usersData);
    } catch (error) {
      console.error("Erro ao carregar configurações", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- MÁSCARA CNPJ ---
  const maskCNPJ = (value: string) => {
    if (!value) return "";
    const v = value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
    if (v.length > 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
    if (v.length > 5) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
    if (v.length > 2) return `${v.slice(0, 2)}.${v.slice(2)}`;
    return v;
  };

  // --- HANDLER UPLOAD LOGO ---
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setNotification({ type: 'ERROR', message: 'A imagem é muito grande. Máximo 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTenant((prev: any) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- HANDLERS EMPRESA ---
  const handleSaveTenant = async () => {
    try {
      await api.tenants.updateMe(tenant);
      setNotification({ type: 'SUCCESS', message: 'Configurações salvas com sucesso!' });
    } catch (error) {
      setNotification({ type: 'ERROR', message: 'Erro ao salvar configurações.' });
    }
  };

  // --- HANDLERS USUÁRIO (CRIAR E EDITAR) ---

  const openCreateUserModal = () => {
    setUserData({ name: '', email: '', password: '', role: 'DISPATCHER' });
    setEditingUserId(null); // Modo Criação
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: any) => {
    setUserData({
      name: user.name,
      email: user.email,
      password: '', // Senha vem vazia na edição (só preenche se quiser trocar)
      role: user.role
    });
    setEditingUserId(user.id); // Modo Edição
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        // MODO EDIÇÃO
        const payload: any = { ...userData };
        if (!payload.password) delete payload.password; // Se não digitou senha, não envia (mantém a antiga)

        await api.users.update(editingUserId, payload);
        setNotification({ type: 'SUCCESS', message: 'Usuário atualizado com sucesso!' });
      } else {
        // MODO CRIAÇÃO
        if (!userData.password) {
          setNotification({ type: 'ERROR', message: 'Senha é obrigatória para novos usuários.' });
          return;
        }
        await api.users.create(userData);
        setNotification({ type: 'SUCCESS', message: 'Usuário criado com sucesso!' });
      }

      setIsUserModalOpen(false);
      loadData(); // Recarrega lista
    } catch (error) {
      setNotification({ type: 'ERROR', message: 'Erro ao salvar usuário.' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este usuário? Ele perderá o acesso imediatamente.")) {
      try {
        await api.users.delete(id);
        setTeamMembers(teamMembers.filter(u => u.id !== id));
        setNotification({ type: 'SUCCESS', message: 'Usuário removido com sucesso.' });
      } catch (error) {
        setNotification({ type: 'ERROR', message: 'Erro ao remover usuário.' });
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Shield className="text-blue-600" /> Configurações
        </h1>
        <p className="text-slate-500 mt-1">Gerencie os dados da sua organização, equipe e regras de negócio.</p>
      </div>

      {/* NOTIFICAÇÃO GLOBAL */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
          }`}>
          {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <div className="font-bold text-sm">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-70 hover:opacity-100"><X size={18} /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Navegação */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('PROFILE')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'PROFILE' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Building size={18} /> Perfil da Empresa
            </button>
            <button
              onClick={() => setActiveTab('TEAM')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'TEAM' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Users size={18} /> Equipe & Acesso
            </button>
            <button
              onClick={() => setActiveTab('PREFERENCES')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'PREFERENCES' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Sliders size={18} /> Preferências
            </button>
          </nav>
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1">

          {/* --- ABA PERFIL --- */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Dados da Organização</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* UPLOAD DE LOGO */}
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Logotipo</label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 overflow-hidden relative group">
                        {tenant.logoUrl ? (
                          <img src={tenant.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <ImageIcon size={32} />
                        )}
                        {/* Overlay para remover */}
                        {tenant.logoUrl && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setTenant({ ...tenant, logoUrl: '' })} className="text-white p-1 bg-red-600 rounded-full"><X size={16} /></button>
                          </div>
                        )}
                      </div>

                      <div>
                        <input
                          type="file"
                          ref={logoInputRef}
                          onChange={handleLogoChange}
                          accept="image/png, image/jpeg, image/svg+xml"
                          className="hidden"
                        />
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                        >
                          <Upload size={18} /> Alterar Imagem
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Recomendado: PNG ou SVG (Max 2MB).</p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome Fantasia</label>
                    <input
                      type="text"
                      value={tenant.name || ''}
                      onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">CNPJ</label>
                    <input
                      type="text"
                      value={tenant.cnpj || ''}
                      onChange={(e) => setTenant({ ...tenant, cnpj: maskCNPJ(e.target.value) })}
                      maxLength={18}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Endereço Comercial</label>
                    <input
                      type="text"
                      value={tenant.address || ''}
                      onChange={(e) => setTenant({ ...tenant, address: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                      placeholder="Av. Principal, 1000 - Cidade - UF"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSaveTenant}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-colors"
                  >
                    <Save size={18} /> Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- ABA EQUIPE --- */}
          {activeTab === 'TEAM' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Gestão de Usuários</h2>
                    <p className="text-sm text-slate-500">Quem tem acesso ao painel administrativo.</p>
                  </div>
                  <button
                    onClick={openCreateUserModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm"
                  >
                    <Plus size={16} /> Novo Usuário
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3 rounded-l-lg">Nome / E-mail</th>
                        <th className="p-3">Função</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 rounded-r-lg text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamMembers.map(member => (
                        <tr key={member.id}>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{member.name}</div>
                            <div className="text-xs text-slate-500">{member.email}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                              {member.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                              <Check size={12} /> Ativo
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              {/* BOTÃO DE EDITAR */}
                              <button
                                onClick={() => openEditUserModal(member)}
                                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                title="Editar Usuário"
                              >
                                <Edit size={18} />
                              </button>

                              {/* BOTÃO DE DELETAR */}
                              <button
                                onClick={() => handleDeleteUser(member.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                title="Remover Acesso"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* --- ABA PREFERÊNCIAS (NOVA) --- */}
          {activeTab === 'PREFERENCES' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* CARTÃO: IMPORTAÇÃO DE DADOS */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Importação de Dados</h2>
                    <p className="text-slate-500 text-sm">Defina como o sistema deve identificar registros ao importar planilhas.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* ESTRATÉGIA DE MOTORISTAS */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Identificação de Motoristas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${(tenant.config?.driverImportStrategy || 'CPF') === 'CPF'
                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                        : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">Por CPF</span>
                          <input
                            type="radio"
                            name="importStrategy"
                            value="CPF"
                            checked={(tenant.config?.driverImportStrategy || 'CPF') === 'CPF'}
                            onChange={() => setTenant({ ...tenant, config: { ...tenant.config, driverImportStrategy: 'CPF' } })}
                            className="w-4 h-4 text-blue-600"
                          />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          O sistema buscará motoristas pelo número do CPF. É o método mais seguro e recomendado.
                        </p>
                      </label>

                      <label className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${tenant.config?.driverImportStrategy === 'PHONE'
                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                        : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">Por Telefone</span>
                          <input
                            type="radio"
                            name="importStrategy"
                            value="PHONE"
                            checked={tenant.config?.driverImportStrategy === 'PHONE'}
                            onChange={() => setTenant({ ...tenant, config: { ...tenant.config, driverImportStrategy: 'PHONE' } })}
                            className="w-4 h-4 text-blue-600"
                          />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Busca flexível pelo número de celular. Útil se você não tem o CPF de todos os terceiros.
                        </p>
                      </label>

                      <label className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${tenant.config?.driverImportStrategy === 'EXTERNAL_ID'
                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                        : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">Por Matrícula / ID</span>
                          <input
                            type="radio"
                            name="importStrategy"
                            value="EXTERNAL_ID"
                            checked={tenant.config?.driverImportStrategy === 'EXTERNAL_ID'}
                            onChange={() => setTenant({ ...tenant, config: { ...tenant.config, driverImportStrategy: 'EXTERNAL_ID' } })}
                            className="w-4 h-4 text-blue-600"
                          />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Busca exata pelo código de sistema externo (ERP/TMS). Ideal para integrações.
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* CARTÃO: REGRAS DE ENTREGA */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Regras de Entrega</h2>
                    <p className="text-slate-500 text-sm">Defina as validações necessárias para que uma entrega seja concluída.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* COMPROVANTE OBRIGATÓRIO */}
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600">
                        <Camera size={20} />
                      </div>
                      <div>
                        <span className="block font-bold text-slate-800 text-sm">Exigir Comprovante</span>
                        <span className="text-xs text-slate-500">Impedir que o motorista finalize sem foto/assinatura.</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={tenant.config?.requireProofOfDelivery || false}
                        onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, requireProofOfDelivery: e.target.checked } })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* GEOFENCE */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Raio de Tolerância (Geofence)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tenant.config?.geofenceRadius || 0}
                        onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, geofenceRadius: Number(e.target.value) } })}
                        className="w-32 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        min="0"
                      />
                      <span className="text-slate-500 text-sm">metros</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Distância máxima permitida entre o motorista e o local de entrega. Deixe <b>0</b> para desativar a validação por GPS.</p>
                  </div>

                  {/* WORKFLOW DE ENTREGA */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Fluxo de Baixa (Workflow)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'SIMPLE', label: 'Simples', desc: 'Apenas confirmar entrega.' },
                        { id: 'STANDARD', label: 'Padrão', desc: 'Exige informar chegada.' },
                        { id: 'DETAILED', label: 'Detalhado', desc: 'Chegada > Descarga > Fim.' }
                      ].map((wf) => (
                        <button
                          key={wf.id}
                          onClick={() => setTenant({ ...tenant, config: { ...tenant.config, deliveryWorkflow: wf.id as any } })}
                          className={`
                            p-4 rounded-xl border text-left transition-all
                            ${tenant.config?.deliveryWorkflow === wf.id
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                          `}
                        >
                          <div className={`font-bold mb-1 ${tenant.config?.deliveryWorkflow === wf.id ? 'text-blue-700' : 'text-slate-700'}`}>
                            {wf.label}
                          </div>
                          <div className="text-xs text-slate-500">{wf.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARTÃO: PERSONALIZAÇÃO DE VISUALIZAÇÃO */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Personalização de Visualização</h2>
                    <p className="text-slate-500 text-sm">Ajuste o que deve ser exibido nas tabelas e relatórios.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* SWITCHES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* FINANCEIRO */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <span className="font-bold text-slate-700 text-sm">Exibir Financeiro (R$)</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={tenant.config?.displaySettings?.showFinancials ?? true} // Default true
                          onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, displaySettings: { ...tenant.config?.displaySettings, showFinancials: e.target.checked } } })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* VOLUME */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <span className="font-bold text-slate-700 text-sm">Exibir Volume</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={tenant.config?.displaySettings?.showVolume ?? true} // Default true
                          onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, displaySettings: { ...tenant.config?.displaySettings, showVolume: e.target.checked } } })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* PESO */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <span className="font-bold text-slate-700 text-sm">Exibir Peso</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={tenant.config?.displaySettings?.showWeight ?? false} // Default false
                          onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, displaySettings: { ...tenant.config?.displaySettings, showWeight: e.target.checked } } })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* INPUTS CONDICIONAIS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(tenant.config?.displaySettings?.showVolume ?? true) && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Rótulo de Volume</label>
                        <input
                          type="text"
                          value={tenant.config?.displaySettings?.volumeLabel || ''}
                          onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, displaySettings: { ...tenant.config?.displaySettings, volumeLabel: e.target.value } } })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                          placeholder="Ex: Caixas, m³, Litros"
                        />
                      </div>
                    )}

                    {(tenant.config?.displaySettings?.showWeight ?? false) && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Rótulo de Peso</label>
                        <input
                          type="text"
                          value={tenant.config?.displaySettings?.weightLabel || ''}
                          onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, displaySettings: { ...tenant.config?.displaySettings, weightLabel: e.target.value } } })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                          placeholder="Ex: Kg, Toneladas, Lbs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARTÃO: COMUNICAÇÃO DO BOT */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Comunicação do Bot</h2>
                    <p className="text-slate-500 text-sm">Personalize as mensagens automáticas enviadas pelo WhatsApp.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* SELETOR DE PROVEDOR */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Provedor de Mensagens (Gateway)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${(tenant.config?.whatsappProvider || 'ZAPI') === 'ZAPI'
                        ? 'bg-green-50 border-green-200 ring-1 ring-green-200'
                        : 'bg-white border-slate-200 hover:border-green-200 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">Z-API (Padrão)</span>
                          <input
                            type="radio"
                            name="whatsappProvider"
                            value="ZAPI"
                            checked={(tenant.config?.whatsappProvider || 'ZAPI') === 'ZAPI'}
                            onChange={() => setTenant({ ...tenant, config: { ...tenant.config, whatsappProvider: 'ZAPI' } })}
                            className="w-4 h-4 text-green-600"
                          />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Conexão direta via QR Code. Ideal para volume alto.
                        </p>
                      </label>

                      <label className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${tenant.config?.whatsappProvider === 'SENDPULSE'
                        ? 'bg-green-50 border-green-200 ring-1 ring-green-200'
                        : 'bg-white border-slate-200 hover:border-green-200 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">SendPulse</span>
                          <input
                            type="radio"
                            name="whatsappProvider"
                            value="SENDPULSE"
                            checked={tenant.config?.whatsappProvider === 'SENDPULSE'}
                            onChange={() => setTenant({ ...tenant, config: { ...tenant.config, whatsappProvider: 'SENDPULSE' } })}
                            className="w-4 h-4 text-green-600"
                          />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          API oficial/parceira. Requer conta configurada no SendPulse.
                        </p>
                      </label>
                    </div>

                    {tenant.config?.whatsappProvider === 'SENDPULSE' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-2 text-xs text-yellow-700">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>
                          <strong>Atenção:</strong> Certifique-se de que o Webhook no painel do SendPulse está apontando para a URL correta do seu servidor (<code>/webhook/sendpulse</code>).
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Saudação Inicial</label>
                    <textarea
                      rows={3}
                      value={tenant.config?.whatsappTemplates?.greeting || ''}
                      onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, whatsappTemplates: { ...tenant.config?.whatsappTemplates, greeting: e.target.value } } })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm"
                      placeholder="Olá! Sou o assistente virtual da [Nome da Empresa]..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem de Sucesso (Baixa)</label>
                    <textarea
                      rows={3}
                      value={tenant.config?.whatsappTemplates?.success || ''}
                      onChange={(e) => setTenant({ ...tenant, config: { ...tenant.config, whatsappTemplates: { ...tenant.config?.whatsappTemplates, success: e.target.value } } })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm"
                      placeholder="Sucesso! Baixa confirmada na nota {nf}..."
                    />
                    <p className="text-xs text-slate-400 mt-2 mb-3">
                      <span className="font-bold">Dica:</span> Você pode usar variáveis dinâmicas na mensagem:
                    </p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <button type="button" onClick={() => setTenant({ ...tenant, config: { ...tenant.config, whatsappTemplates: { ...tenant.config?.whatsappTemplates, success: (tenant.config?.whatsappTemplates?.success || '') + '{motorista}' } } })} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors font-mono font-bold">{'{motorista}'}</button>
                      <button type="button" onClick={() => setTenant({ ...tenant, config: { ...tenant.config, whatsappTemplates: { ...tenant.config?.whatsappTemplates, success: (tenant.config?.whatsappTemplates?.success || '') + '{nf}' } } })} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors font-mono font-bold">{'{nf}'}</button>
                      <button type="button" onClick={() => setTenant({ ...tenant, config: { ...tenant.config, whatsappTemplates: { ...tenant.config?.whatsappTemplates, success: (tenant.config?.whatsappTemplates?.success || '') + '{cliente}' } } })} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors font-mono font-bold">{'{cliente}'}</button>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-white border-t border-slate-100 flex justify-end rounded-b-xl z-10">
                  <button
                    onClick={handleSaveTenant}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-colors"
                  >
                    <Save size={18} /> Salvar Preferências
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL USUÁRIO (CRIAR / EDITAR) */}
      {
        isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <button onClick={() => setIsUserModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome</label>
                  <input required className="w-full p-2 border rounded" value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                  <input type="email" required className="w-full p-2 border rounded" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {editingUserId ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                  </label>
                  <input
                    type="text"
                    required={!editingUserId} // Obrigatório apenas se for novo
                    className="w-full p-2 border rounded"
                    value={userData.password}
                    onChange={e => setUserData({ ...userData, password: e.target.value })}
                    placeholder={editingUserId ? "Deixe em branco para manter a atual" : ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Função</label>
                  <select className="w-full p-2 border rounded" value={userData.role} onChange={e => setUserData({ ...userData, role: e.target.value })}>
                    <option value="ADMIN">Administrador</option>
                    <option value="DISPATCHER">Expedidor</option>
                    <option value="DRIVER">Motorista (Acesso App)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm">
                  {editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};