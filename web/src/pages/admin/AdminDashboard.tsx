import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Building2, Users, Truck, Car, Plus, Search, Lock, Unlock, AlertCircle, X, CheckCircle, Save, Loader2, TrendingUp, DollarSign, Activity, LogOut, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

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

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({ name: '', slug: '', plan: 'FREE', adminName: '', adminEmail: '', adminPassword: '' });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const openEditModal = (tenant: Tenant) => {
        setIsEditing(true);
        setEditingId(tenant.id);
        setFormData({
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            adminName: '', // Não editamos admin aqui
            adminEmail: '',
            adminPassword: ''
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            if (isEditing && editingId) {
                await api.backoffice.updateTenant(editingId, {
                    name: formData.name,
                    slug: formData.slug,
                    plan: formData.plan
                });
                setSuccess('Empresa atualizada com sucesso!');
            } else {
                await api.backoffice.createTenant(formData);
                setSuccess('Empresa criada com sucesso!');
            }

            setIsModalOpen(false);
            fetchTenants();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao salvar empresa.');
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

    // --- STATS CALCULATION ---
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
    const totalUsers = tenants.reduce((acc, t) => acc + t._count.users, 0);

    // Estimativa de Receita (MRR)
    const calculateMRR = () => {
        return tenants.reduce((acc, t) => {
            if (t.status !== 'ACTIVE') return acc;
            switch (t.plan) {
                case 'STARTER': return acc + 99;
                case 'PRO': return acc + 199;
                case 'ENTERPRISE': return acc + 499;
                default: return acc;
            }
        }, 0);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Painel Super Admin</h1>
                        <p className="text-slate-500">Visão geral da plataforma e gestão de tenants</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleLogout}
                            className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                        >
                            <LogOut size={20} /> Sair
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                        >
                            <Plus size={20} /> Nova Empresa
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium uppercase tracking-wider">
                            <Building2 size={16} /> Total Empresas
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{totalTenants}</div>
                        <div className="text-xs text-green-600 font-bold bg-green-50 w-fit px-2 py-1 rounded-full flex items-center gap-1">
                            <TrendingUp size={12} /> +{tenants.filter(t => new Date(t.createdAt) > new Date(Date.now() - 86400000 * 30)).length} este mês
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium uppercase tracking-wider">
                            <Activity size={16} /> Ativas
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{activeTenants}</div>
                        <div className="text-xs text-slate-400">
                            {((activeTenants / (totalTenants || 1)) * 100).toFixed(0)}% da base
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium uppercase tracking-wider">
                            <Users size={16} /> Usuários Totais
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{totalUsers}</div>
                        <div className="text-xs text-slate-400">
                            Média de {(totalUsers / (totalTenants || 1)).toFixed(1)} por empresa
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium uppercase tracking-wider">
                            <DollarSign size={16} /> MRR Estimado
                        </div>
                        <div className="text-3xl font-bold text-green-600">R$ {calculateMRR().toLocaleString('pt-BR')}</div>
                        <div className="text-xs text-slate-400">
                            Baseado nos planos ativos
                        </div>
                    </div>
                </div>

                {/* Filters & List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nome, slug ou plano..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                            <p>Carregando dados da plataforma...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 pl-6">Empresa</th>
                                        <th className="p-4">Plano</th>
                                        <th className="p-4">Métricas</th>
                                        <th className="p-4">Data Criação</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right pr-6">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTenants.map(tenant => (
                                        <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                                        {tenant.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{tenant.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono">/{tenant.slug}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${tenant.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                    tenant.plan === 'PRO' ? 'bg-blue-100 text-blue-700' :
                                                        tenant.plan === 'STARTER' ? 'bg-indigo-100 text-indigo-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {tenant.plan}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-4 text-xs font-medium text-slate-500">
                                                    <div className="flex flex-col items-center gap-1 min-w-[30px]">
                                                        <Users size={16} className="text-slate-400" />
                                                        <span>{tenant._count.users}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1 min-w-[30px]">
                                                        <Truck size={16} className="text-slate-400" />
                                                        <span>{tenant._count.drivers}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1 min-w-[30px]">
                                                        <Car size={16} className="text-slate-400" />
                                                        <span>{tenant._count.vehicles}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-500">
                                                {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1.5 ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                    tenant.status === 'BLOCKED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'ACTIVE' ? 'bg-green-500' :
                                                        tenant.status === 'BLOCKED' ? 'bg-red-500' :
                                                            'bg-yellow-500'
                                                        }`} />
                                                    {tenant.status === 'ACTIVE' ? 'ATIVO' : tenant.status === 'BLOCKED' ? 'BLOQUEADO' : 'TRIAL'}
                                                </span>
                                            </td>
                                            <td className="p-4 pr-6 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(tenant)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                    title="Editar Empresa"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(tenant.id, tenant.status)}
                                                    className={`p-2 rounded-lg transition-all ${tenant.status === 'ACTIVE'
                                                        ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                        : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={tenant.status === 'ACTIVE' ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                                                >
                                                    {tenant.status === 'ACTIVE' ? <Lock size={18} /> : <Unlock size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Success Toast */}
                {success && (
                    <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 z-50">
                        <div className="bg-green-500 rounded-full p-1">
                            <CheckCircle size={16} className="text-white" />
                        </div>
                        <span className="font-medium">{success}</span>
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Editar Empresa' : 'Nova Empresa'}</h2>
                                    <p className="text-sm text-slate-500">{isEditing ? 'Atualize os dados do tenant' : 'Cadastre um novo tenant na plataforma'}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {error && (
                                    <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-3 border border-red-100">
                                        <AlertCircle size={20} className="shrink-0" /> {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome da Empresa</label>
                                        <input required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Logística Rápida" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Slug (URL)</label>
                                        <input required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })} placeholder="ex: logistica-rapida" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plano de Assinatura</label>
                                    <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value })}>
                                        <option value="FREE">Gratuito (Trial 14 dias)</option>
                                        <option value="STARTER">Starter (R$ 99/mês)</option>
                                        <option value="PRO">Pro (R$ 199/mês)</option>
                                        <option value="ENTERPRISE">Enterprise (R$ 499/mês)</option>
                                    </select>
                                </div>

                                {!isEditing && (
                                    <div className="border-t border-slate-100 pt-5">
                                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Users size={18} className="text-blue-600" />
                                            Primeiro Administrador
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                                                <input required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={formData.adminName} onChange={e => setFormData({ ...formData, adminName: e.target.value })} placeholder="Ex: João Silva" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail de Acesso</label>
                                                <input type="email" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })} placeholder="joao@empresa.com" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha Temporária</label>
                                                <input type="password" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={formData.adminPassword} onChange={e => setFormData({ ...formData, adminPassword: e.target.value })} placeholder="••••••••" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancelar</button>
                                    <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100">
                                        {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        {isEditing ? 'Salvar Alterações' : 'Criar Empresa'}
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
