import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../types';
import { Users, Search, MessageCircle, Building, Plus, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Eye, Edit2, User, X, Phone, Filter, MapPin } from 'lucide-react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { cleanDigits, maskCpfCnpj, maskPhone } from '../utils/masks';
import { isValidCnpj, isValidPhone, hasMask } from '../utils/validators';
import { ImportFeedbackModal, ImportSummary } from '../components/ImportFeedbackModal';

export const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    // Estados de Paginação e Busca
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Estados de Modal e Seleção
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
    const [formData, setFormData] = useState<Partial<Customer>>({
        addressDetails: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' }
    });
    const [modalLoading, setModalLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounce da busca
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Carregar dados
    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('zaproute_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const response = await api.customers.getAll(user.tenantId, page, 10, debouncedSearch, statusFilter);

                setCustomers(response.data);
                setTotalPages(response.meta.lastPage);
                setTotalItems(response.meta.total);
            }
        } catch (e) {
            console.error("Failed to load customers", e);
            setNotification({ type: 'ERROR', message: 'Falha ao carregar clientes.' });
        } finally {
            setLoading(false);
        }
    };

    // Recarrega quando muda página, busca ou filtro
    useEffect(() => {
        fetchCustomers();
    }, [page, debouncedSearch, statusFilter]);

    // Auto-dismiss notificação
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // --- AÇÕES ---
    const openCreateModal = () => {
        setFormData({
            legalName: '', tradeName: '', cnpj: '', stateRegistration: '',
            email: '', phone: '', whatsapp: '', salesperson: '', sellerId: '',
            status: 'ACTIVE', creditLimit: 0,
            addressDetails: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
            location: { lat: 0, lng: 0, address: '' }
        });
        setFormError('');
        setModalMode('CREATE');
        setIsModalOpen(true);
    };

    const openEditModal = (customer: Customer) => {
        setFormData({
            ...customer,
            cnpj: maskCpfCnpj(customer.cnpj),
            phone: maskPhone(customer.phone),
            whatsapp: maskPhone(customer.whatsapp || ''),
            addressDetails: customer.addressDetails || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
            location: customer.location || { lat: 0, lng: 0, address: '' }
        });
        setFormError('');
        setModalMode('EDIT');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalLoading(true);
        setFormError('');

        try {
            const userStr = localStorage.getItem('zaproute_user');
            const user = userStr ? JSON.parse(userStr) : null;

            const payload = {
                ...formData,
                cnpj: cleanDigits(formData.cnpj || ''),
                phone: cleanDigits(formData.phone || ''),
                whatsapp: cleanDigits(formData.whatsapp || ''),
                addressDetails: {
                    ...formData.addressDetails,
                    zipCode: cleanDigits(formData.addressDetails?.zipCode || '')
                } as any
            };

            if (payload.creditLimit) payload.creditLimit = Number(payload.creditLimit);
            if (!payload.location) payload.location = { lat: 0, lng: 0, address: '' };

            if (modalMode === 'CREATE') {
                const createPayload = { ...payload, tenantId: user.tenantId };
                await api.customers.create(createPayload);
                setNotification({ type: 'SUCCESS', message: 'Cliente cadastrado com sucesso!' });
            } else {
                if (formData.id) {
                    await api.customers.update(formData.id, payload);
                    if (selectedCustomer && selectedCustomer.id === formData.id) {
                        setSelectedCustomer({ ...selectedCustomer, ...payload } as Customer);
                    }
                    setNotification({ type: 'SUCCESS', message: 'Dados atualizados!' });
                }
            }
            setIsModalOpen(false);
            fetchCustomers();
        } catch (error) {
            console.error(error);
            setFormError('Erro ao salvar. Verifique os dados.');
        } finally {
            setModalLoading(false);
        }
    };

    // Estados de Importação
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importStatus, setImportStatus] = useState<'PROCESSING' | 'COMPLETED'>('PROCESSING');
    const [importProgress, setImportProgress] = useState(0);
    const [importChunkInfo, setImportChunkInfo] = useState({ current: 0, total: 0 });
    const [importSummary, setImportSummary] = useState<ImportSummary>({ total: 0, success: 0, errors: 0, errorDetails: [] });

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportSummary({ total: 0, success: 0, errors: 0, errorDetails: [] });
        setImportProgress(0);
        setImportStatus('PROCESSING');
        setImportModalOpen(true);

        const userStr = localStorage.getItem('zaproute_user');
        const user = userStr ? JSON.parse(userStr) : {};

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                if (rows.length === 0) throw new Error("O arquivo está vazio.");

                const allCustomers: any[] = [];
                const validationErrors: string[] = [];

                rows.forEach((row: any, index: number) => {
                    const line = index + 2;
                    const rawCnpj = String(row['CNPJ'] || '');
                    const rawPhone = String(row['Telefone'] || '');
                    const rawZip = String(row['CEP'] || '');
                    const legalName = row['RazaoSocial'] || row['NomeFantasia'];

                    if (!legalName) {
                        validationErrors.push(`Linha ${line}: Nome/Razão Social é obrigatório.`);
                        return;
                    }

                    if (hasMask(rawCnpj)) {
                        validationErrors.push(`Linha ${line}: CNPJ contém pontuação (${rawCnpj}). Use apenas números.`);
                        return;
                    }
                    if (hasMask(rawPhone)) {
                        validationErrors.push(`Linha ${line}: Telefone contém pontuação (${rawPhone}). Use apenas números.`);
                        return;
                    }
                    if (hasMask(rawZip)) {
                        validationErrors.push(`Linha ${line}: CEP contém pontuação (${rawZip}). Use apenas números.`);
                        return;
                    }

                    const cnpj = cleanDigits(rawCnpj);
                    const phone = cleanDigits(rawPhone);

                    if (cnpj && !isValidCnpj(cnpj)) {
                        validationErrors.push(`Linha ${line}: CNPJ inválido (${row['CNPJ']}).`);
                        return;
                    }
                    if (phone && !isValidPhone(phone)) {
                        validationErrors.push(`Linha ${line}: Telefone inválido (${row['Telefone']}).`);
                        return;
                    }

                    allCustomers.push({
                        legalName: legalName,
                        tradeName: row['NomeFantasia'] || row['RazaoSocial'],
                        cnpj: cnpj,
                        email: row['Email'],
                        phone: phone,
                        whatsapp: cleanDigits(String(row['WhatsApp'] || row['Telefone'] || '')),
                        salesperson: row['Vendedor'],
                        addressDetails: {
                            street: row['Rua'] || '',
                            number: String(row['Numero'] || ''),
                            neighborhood: row['Bairro'] || '',
                            city: row['Cidade'] || '',
                            state: row['Estado'] || row['UF'] || '',
                            zipCode: cleanDigits(rawZip)
                        },
                        location: {
                            lat: row['Latitude'] ? Number(row['Latitude']) : 0,
                            lng: row['Longitude'] ? Number(row['Longitude']) : 0,
                            address: `${row['Rua'] || ''}, ${row['Numero'] || ''}`
                        }
                    });
                });

                if (validationErrors.length > 0) {
                    setImportSummary({
                        total: rows.length,
                        success: 0,
                        errors: validationErrors.length,
                        errorDetails: validationErrors
                    });
                    setImportStatus('COMPLETED');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return;
                }

                const totalItems = allCustomers.length;
                const BATCH_SIZE = 50;
                const totalChunks = Math.ceil(totalItems / BATCH_SIZE);

                let successCount = 0;
                let errorCount = 0;
                let errors: string[] = [];

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * BATCH_SIZE;
                    const end = start + BATCH_SIZE;
                    const chunk = allCustomers.slice(start, end);

                    setImportChunkInfo({ current: i + 1, total: totalChunks });

                    try {
                        await api.customers.import(user.tenantId, chunk);
                        successCount += chunk.length;
                    } catch (err: any) {
                        console.error(`Erro no lote ${i + 1}:`, err);
                        errorCount += chunk.length;
                        errors.push(`Lote ${i + 1}: Falha ao processar ${chunk.length} itens. (${err.message})`);
                    }

                    const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
                    setImportProgress(currentProgress);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                setImportSummary({
                    total: totalItems,
                    success: successCount,
                    errors: errorCount,
                    errorDetails: errors
                });
                setImportStatus('COMPLETED');
                fetchCustomers();

            } catch (error: any) {
                console.error("Erro fatal na importação:", error);
                setImportSummary((prev: ImportSummary) => ({ ...prev, errors: 1, errorDetails: [`Erro fatal: ${error.message}`] }));
                setImportStatus('COMPLETED');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    function handleAddressChange(field: string, value: string) {
        setFormData(prev => {
            const currentAddress = prev.addressDetails || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' };
            return { ...prev, addressDetails: { ...currentAddress, [field]: value } };
        });
    }

    const handleLocationChange = (field: 'lat' | 'lng', value: string) => {
        setFormData(prev => ({
            ...prev,
            location: { ...prev.location, [field]: Number(value) } as any
        }));
    };

    // --- RENDER DETALHE ---
    if (selectedCustomer) {
        return (
            <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
                        <ChevronLeft size={20} /> Voltar para Lista
                    </button>
                    <button onClick={() => openEditModal(selectedCustomer)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2">
                        <Edit2 size={18} /> Editar Cliente
                    </button>
                </div>

                {notification && (
                    <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                        {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <div className="font-bold text-sm">{notification.message}</div>
                        <button onClick={() => setNotification(null)} className="ml-auto"><X size={18} /></button>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-2 ${selectedCustomer.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 font-bold text-2xl">
                            {selectedCustomer.tradeName.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{selectedCustomer.tradeName}</h1>
                            <p className="text-slate-500 font-medium">{selectedCustomer.legalName}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-6 lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Building size={18} /> Dados Cadastrais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><span className="text-xs text-slate-400 uppercase font-bold">CNPJ</span><p className="font-medium text-slate-700">{maskCpfCnpj(selectedCustomer.cnpj)}</p></div>
                                <div><span className="text-xs text-slate-400 uppercase font-bold">Vendedor</span><p className="font-medium text-slate-700 text-blue-600">{selectedCustomer.seller?.name || selectedCustomer.salesperson || 'N/A'}</p></div>
                                <div><span className="text-xs text-slate-400 uppercase font-bold">Limite de Crédito</span><p className="font-medium text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCustomer.creditLimit || 0)}</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Phone size={18} /> Contato</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><span className="text-xs text-slate-400 uppercase font-bold">Telefone</span><p className="font-medium text-slate-700">{maskPhone(selectedCustomer.phone)}</p></div>
                                <div><span className="text-xs text-slate-400 uppercase font-bold">WhatsApp</span><p className="font-medium text-green-600">{maskPhone(selectedCustomer.whatsapp)}</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><MapPin size={18} /> Endereço</h3>
                        <p className="text-slate-700 font-medium">{selectedCustomer.addressDetails?.street}, {selectedCustomer.addressDetails?.number}</p>
                        <p className="text-slate-500 text-sm">{selectedCustomer.addressDetails?.neighborhood} - {selectedCustomer.addressDetails?.city}/{selectedCustomer.addressDetails?.state}</p>
                    </div>
                </div>

                {isModalOpen && <CustomerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={modalLoading} formError={formError} maskCNPJ={maskCpfCnpj} maskPhone={maskPhone} handleAddressChange={handleAddressChange} handleLocationChange={handleLocationChange} />}
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3"><Users className="text-blue-600" /> Clientes</h1>
                    <p className="text-slate-500 mt-1 text-sm md:text-base">Base de clientes ({totalItems} total).</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    {/* FILTROS */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-40">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                            >
                                <option value="">Todos Status</option>
                                <option value="ACTIVE">Ativos</option>
                                <option value="BLOCKED">Bloqueados</option>
                                <option value="INACTIVE">Inativos</option>
                            </select>
                        </div>
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar nome ou CNPJ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"><FileSpreadsheet size={18} /> Importar</button>
                        <button onClick={openCreateModal} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm text-sm"><Plus size={18} /> Novo</button>
                    </div>
                </div>
            </div>

            {/* NOTIFICAÇÃO GLOBAL */}
            {notification && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <div className="font-bold text-sm">{notification.message}</div>
                    <button onClick={() => setNotification(null)} className="ml-auto"><X size={18} /></button>
                </div>
            )}

            {/* CONTEÚDO */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="animate-spin" /> Carregando...
                    </div>
                ) : (
                    <>
                        {/* DESKTOP TABLE */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase">
                                    <tr>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">CNPJ / Cidade</th>
                                        <th className="p-4">Contato</th>
                                        <th className="p-4">Vendedor</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {customers.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                        {c.tradeName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{c.tradeName}</div>
                                                        <div className="text-xs text-slate-500">{c.legalName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4"><div className="text-slate-600 text-sm">{maskCpfCnpj(c.cnpj)}</div><div className="text-xs text-slate-400">{c.addressDetails?.city} - {c.addressDetails?.state}</div></td>
                                            <td className="p-4"><div className="flex items-center gap-1 text-green-600 font-medium text-sm"><MessageCircle size={14} /> {maskPhone(c.whatsapp)}</div></td>
                                            <td className="p-4"><div className="flex items-center gap-2 text-sm"><User size={14} className="text-slate-400" /><span>{c.seller?.name || c.salesperson || '---'}</span></div></td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                        c.status === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {c.status === 'ACTIVE' ? 'ATIVO' : c.status === 'BLOCKED' ? 'BLOQUEADO' : 'INATIVO'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => setSelectedCustomer(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Ver Detalhes">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => openEditModal(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar">
                                                        <Edit2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {customers.length === 0 && !loading && (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE CARDS */}
                        <div className="md:hidden p-4 space-y-4">
                            {customers.map(c => (
                                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:scale-[0.99] transition-transform" onClick={() => setSelectedCustomer(c)}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                {c.tradeName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{c.tradeName}</div>
                                                <div className="text-xs text-slate-500">{maskCpfCnpj(c.cnpj)}</div>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                c.status === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {c.status === 'ACTIVE' ? 'ATIVO' : c.status === 'BLOCKED' ? 'BLOQUEADO' : 'INATIVO'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                                        <div className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {c.addressDetails?.city}/{c.addressDetails?.state}</div>
                                        <div className="flex items-center gap-1"><User size={12} className="text-slate-400" /> {c.seller?.name || '---'}</div>
                                    </div>

                                    <div className="flex justify-end gap-2 border-t pt-3">
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(c); }} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">Editar</button>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">Detalhes</button>
                                    </div>
                                </div>
                            ))}
                            {customers.length === 0 && !loading && (
                                <div className="text-center py-8 text-slate-400">Nenhum cliente encontrado.</div>
                            )}
                        </div>

                        {/* PAGINAÇÃO */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between mt-auto">
                            <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-white border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 bg-white border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {isModalOpen && <CustomerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={modalLoading} formError={formError} maskCNPJ={maskCpfCnpj} maskPhone={maskPhone} handleAddressChange={handleAddressChange} handleLocationChange={handleLocationChange} />}

            <ImportFeedbackModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                status={importStatus}
                progress={importProgress}
                currentChunk={importChunkInfo.current}
                totalChunks={importChunkInfo.total}
                summary={importSummary}
            />
        </div>
    );
};