import React, { useState, useEffect, useRef } from 'react';
import { Building, Users, Bell, Save, Shield, Plus, Trash2, Check, X, Loader2, CheckCircle, AlertCircle, Upload, Image as ImageIcon, Edit } from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'TEAM' | 'NOTIFICATIONS'>('PROFILE');
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
    if (v.length > 12) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
    if (v.length > 8) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
    if (v.length > 5) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
    if (v.length > 2) return `${v.slice(0,2)}.${v.slice(2)}`;
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
          setNotification({ type: 'SUCCESS', message: 'Dados da organização atualizados com sucesso!' });
      } catch (error) {
          setNotification({ type: 'ERROR', message: 'Erro ao salvar dados da empresa.' });
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
        <p className="text-slate-500 mt-1">Gerencie os dados da sua organização e equipe.</p>
      </div>

      {/* NOTIFICAÇÃO GLOBAL */}
      {notification && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
              notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
          }`}>
              {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <div className="font-bold text-sm">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-70 hover:opacity-100"><X size={18}/></button>
          </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Navegação */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('PROFILE')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                activeTab === 'PROFILE' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building size={18} /> Perfil da Empresa
            </button>
            <button
              onClick={() => setActiveTab('TEAM')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                activeTab === 'TEAM' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users size={18} /> Equipe & Acesso
            </button>
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                activeTab === 'NOTIFICATIONS' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Bell size={18} /> Preferências
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
                                <button onClick={() => setTenant({...tenant, logoUrl: ''})} className="text-white p-1 bg-red-600 rounded-full"><X size={16}/></button>
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
                      onChange={(e) => setTenant({...tenant, name: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">CNPJ</label>
                    <input 
                      type="text" 
                      value={tenant.cnpj || ''}
                      onChange={(e) => setTenant({...tenant, cnpj: maskCNPJ(e.target.value)})}
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
                      onChange={(e) => setTenant({...tenant, address: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
                      placeholder="Av. Principal, 1000 - Cidade - UF"
                    />
                  </div>
                  
                  {/* REMOVIDO: Campo de Cor Primária */}
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

          {/* --- ABA NOTIFICAÇÕES --- */}
          {activeTab === 'NOTIFICATIONS' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Preferências</h2>
                <p className="text-slate-500">Configurações de notificação serão implementadas em breve.</p>
             </div>
          )}
        </div>
      </div>

      {/* MODAL USUÁRIO (CRIAR / EDITAR) */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800">
                          {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
                      </h3>
                      <button onClick={() => setIsUserModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <form onSubmit={handleSaveUser} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nome</label>
                          <input required className="w-full p-2 border rounded" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                          <input type="email" required className="w-full p-2 border rounded" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} />
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
                            onChange={e => setUserData({...userData, password: e.target.value})} 
                            placeholder={editingUserId ? "Deixe em branco para manter a atual" : ""}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Função</label>
                          <select className="w-full p-2 border rounded" value={userData.role} onChange={e => setUserData({...userData, role: e.target.value})}>
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
      )}
    </div>
  );
};