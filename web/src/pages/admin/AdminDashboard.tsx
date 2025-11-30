import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Building2, Users, Truck, Car, Plus, Search, Lock, Unlock, AlertCircle, X, CheckCircle, Save, Loader2 } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: 'ACTIVE' | 'BLOCKED' | 'TRIAL';
    createdAt: string;
    _count: {
        users: number;
        drivers: number;
        vehicles: number;
    };
}

export const AdminDashboard: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        plan: 'FREE',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const data = await api.backoffice.getAllTenants();
            setTenants(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await api.backoffice.createTenant(formData);
            setSuccess('Empresa criada com sucesso!');
            setIsModalOpen(false);
            fetchTenants();
            setFormData({ name: '', slug: '', plan: 'FREE', adminName: '', adminEmail: '', adminPassword: '' });
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao criar empresa.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        if (!confirm(`Deseja realmente alterar o status para ${newStatus}?`)) return;

        try {
            await api.backoffice.updateTenantStatus(id, newStatus);
            setTenants(tenants.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
        } catch (err) {
            alert('Erro ao atualizar status.');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Painel Super Admin</h1>
                        <p className="text-slate-500">Gerenciamento de Empresas (Tenants)</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors">
                        <Plus size={20} /> Nova Empresa
                    </button>
                </div>

                {/* Stats Summary (Optional - could be added later) */}

                {/* Filters & List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou slug..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Carregando...</div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-4">Empresa</th>
                                    <th className="p-4">Plano</th>
                                    <th className="p-4">Estatísticas</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTenants.map(tenant => (
                                    <tr key={tenant.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                <Building2 size={16} className="text-slate-400" />
                                                {tenant.name}
                                            </div>
                                            <div className="text-xs text-slate-400 ml-6">/{tenant.slug}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">{tenant.plan}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-4 text-xs font-medium text-slate-500">
                                                <span className="flex items-center gap-1" title="Usuários"><Users size={14} /> {tenant._count.users}</span>
                                                <span className="flex items-center gap-1" title="Motoristas"><Truck size={14} /> {tenant._count.drivers}</span>
                                                <span className="flex items-center gap-1" title="Veículos"><Car size={14} /> {tenant._count.vehicles}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                    tenant.status === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {tenant.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {tenant.status === 'ACTIVE' ? 'ATIVO' : tenant.status === 'BLOCKED' ? 'BLOQUEADO' : 'TRIAL'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => toggleStatus(tenant.id, tenant.status)}
                                                className={`p-2 rounded hover:bg-slate-200 transition-colors ${tenant.status === 'ACTIVE' ? 'text-red-500' : 'text-green-500'}`}
                                                title={tenant.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'}
                                            >
                                                {tenant.status === 'ACTIVE' ? <Lock size={18} /> : <Unlock size={18} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Success Toast */}
                {success && (
                    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2">
                        <CheckCircle size={20} /> {success}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                                <h2 className="text-lg font-bold text-slate-800">Nova Empresa</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                            </div>

                            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2">
                                        <AlertCircle size={18} /> {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label>
                                        <input required className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug (URL)</label>
                                        <input required className="w-full p-2 border rounded" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plano</label>
                                    <select className="w-full p-2 border rounded" value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value })}>
                                        <option value="FREE">Gratuito (Trial)</option>
                                        <option value="STARTER">Starter</option>
                                        <option value="PRO">Pro</option>
                                        <option value="ENTERPRISE">Enterprise</option>
                                    </select>
                                </div>

                                <div className="border-t pt-4 mt-4">
                                    <h3 className="font-bold text-slate-700 mb-2 text-sm">Usuário Administrador</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Admin</label>
                                            <input required className="w-full p-2 border rounded" value={formData.adminName} onChange={e => setFormData({ ...formData, adminName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Admin</label>
                                            <input type="email" required className="w-full p-2 border rounded" value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Inicial</label>
                                            <input type="password" required className="w-full p-2 border rounded" value={formData.adminPassword} onChange={e => setFormData({ ...formData, adminPassword: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold">Cancelar</button>
                                    <button type="submit" disabled={submitting} className="px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 font-bold shadow-sm flex items-center gap-2">
                                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        Criar Empresa
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
