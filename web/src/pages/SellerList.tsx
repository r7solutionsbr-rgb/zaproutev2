import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, Loader2, AlertCircle, CheckCircle, Mail, Phone, Briefcase } from 'lucide-react';
import { api } from '../services/api';
import { useData } from '../contexts/DataContext';

interface Seller {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export const SellerList: React.FC = () => {
    // const { user } = useData(); // Removed unused user
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
    const [formData, setFormData] = useState<Partial<Seller>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('zaproute_user');
            const userData = userStr ? JSON.parse(userStr) : null;
            if (userData?.tenantId) {
                const data = await api.sellers.getAll(userData.tenantId);
                setSellers(data);
            }
        } catch (err) {
            console.error(err);
            setNotification({ type: 'ERROR', message: 'Erro ao carregar vendedores.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const userStr = localStorage.getItem('zaproute_user');
            const userData = userStr ? JSON.parse(userStr) : null;

            if (modalMode === 'CREATE') {
                const payload = { ...formData, tenantId: userData.tenantId, status: formData.status || 'ACTIVE' };
                await api.sellers.create(payload);
                setNotification({ type: 'SUCCESS', message: 'Vendedor criado com sucesso!' });
            } else {
                if (formData.id) {
                    await api.sellers.update(formData.id, formData);
                    setNotification({ type: 'SUCCESS', message: 'Vendedor atualizado com sucesso!' });
                }
            }
            setIsModalOpen(false);
            fetchSellers();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar. Verifique os dados.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este vendedor?')) {
            try {
                await api.sellers.remove(id);
                setNotification({ type: 'SUCCESS', message: 'Vendedor excluído.' });
                fetchSellers();
            } catch (err) {
                setNotification({ type: 'ERROR', message: 'Erro ao excluir.' });
            }
        }
    };

    const openCreateModal = () => {
        setFormData({ name: '', email: '', phone: '', status: 'ACTIVE' });
        setModalMode('CREATE');
        setIsModalOpen(true);
        setError('');
    };

    const openEditModal = (seller: Seller) => {
        setFormData(seller);
        setModalMode('EDIT');
        setIsModalOpen(true);
        setError('');
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <Briefcase className="text-blue-600" /> Vendedores
                </h1>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                    <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <Plus size={18} /> Novo Vendedor
                    </button>
                </div>
            </div>

            {/* NOTIFICATION */}
            {notification && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <div className="font-bold text-sm">{notification.message}</div>
                    <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-70 hover:opacity-100"><X size={18} /></button>
                </div>
            )}

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Contato</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSellers.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum vendedor encontrado.</td></tr>
                            ) : (
                                filteredSellers.map(seller => (
                                    <tr key={seller.id} className="hover:bg-slate-50 group transition-colors">
                                        <td className="p-4 font-bold text-slate-800">{seller.name}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                {seller.email && <div className="flex items-center gap-2 text-xs"><Mail size={14} className="text-slate-400" /> {seller.email}</div>}
                                                {seller.phone && <div className="flex items-center gap-2 text-xs"><Phone size={14} className="text-slate-400" /> {seller.phone}</div>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${seller.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {seller.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEditModal(seller)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(seller.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Excluir"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">{modalMode === 'CREATE' ? 'Novo Vendedor' : 'Editar Vendedor'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 rounded text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                                <input required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input type="email" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label>
                                <input className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                <select className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                    <option value="ACTIVE">Ativo</option>
                                    <option value="INACTIVE">Inativo</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex gap-2 items-center hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
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
