import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Mail, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

export const UserSettings: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
    const [formData, setFormData] = useState<Partial<User> & { password?: string }>({});
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);

    // Carregar usuários ao montar
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.users.getAll();
            setUsers(data);
        } catch (error) {
            console.error("Erro ao carregar usuários", error);
            showNotification('ERROR', 'Falha ao carregar lista de usuários.');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (type: 'SUCCESS' | 'ERROR', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modalMode === 'CREATE') {
                // Senha padrão será gerada no backend se não enviada, mas podemos forçar ou pedir aqui
                await api.users.create({ ...formData, status: 'ACTIVE' } as any);
                showNotification('SUCCESS', 'Usuário convidado com sucesso!');
            } else {
                if (formData.id) {
                    await api.users.update(formData.id, formData);
                    showNotification('SUCCESS', 'Usuário atualizado!');
                }
            }
            setIsModalOpen(false);
            loadUsers();
        } catch (error: any) {
            showNotification('ERROR', error.response?.data?.message || 'Erro ao salvar usuário.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja remover este usuário? Ele perderá o acesso imediatamente.")) return;
        try {
            await api.users.delete(id);
            setUsers(users.filter(u => u.id !== id));
            showNotification('SUCCESS', 'Usuário removido.');
        } catch (error) {
            showNotification('ERROR', 'Erro ao remover usuário.');
        }
    };

    const openCreate = () => {
        setFormData({ name: '', email: '', role: 'DISPATCHER', phone: '' }); // Default role
        setModalMode('CREATE');
        setIsModalOpen(true);
    };

    const openEdit = (user: User) => {
        setFormData({ ...user, password: '' }); // Não trazemos a hash da senha
        setModalMode('EDIT');
        setIsModalOpen(true);
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'Administrador';
            case 'DISPATCHER': return 'Operador / Dispatcher';
            case 'DRIVER': return 'Motorista (App)';
            case 'VIEWER': return 'Visualizador';
            default: return role;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Equipe e Permissões</h3>
                    <p className="text-sm text-slate-500">Gerencie quem tem acesso ao painel da sua empresa.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Novo Usuário
                </button>
            </div>

            {notification && (
                <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-bold ${notification.type === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {notification.type === 'SUCCESS' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {notification.message}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 flex justify-center items-center gap-2">
                        <Loader2 className="animate-spin" /> Carregando equipe...
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4">Nome / Email</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{user.name}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1">
                                            <Mail size={12} /> {user.email}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                            user.role === 'DRIVER' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            <Shield size={12} /> {getRoleLabel(user.role)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${user.status === 'ACTIVE' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                            {user.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Remover">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">
                                {modalMode === 'CREATE' ? 'Adicionar Usuário' : 'Editar Usuário'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                <input required className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail de Acesso</label>
                                <input type="email" required className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={modalMode === 'EDIT'} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone (Opcional)</label>
                                <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função / Permissão</label>
                                <select className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                                    <option value="ADMIN">Administrador (Acesso Total)</option>
                                    <option value="DISPATCHER">Operador / Dispatcher</option>
                                    <option value="VIEWER">Visualizador (Somente Leitura)</option>
                                </select>
                            </div>
                            {modalMode === 'EDIT' && (
                                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                                    Para redefinir a senha, o usuário deve usar a opção "Esqueci minha senha" na tela de login.
                                </div>
                            )}
                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                    {saving && <Loader2 className="animate-spin" size={16} />} Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
