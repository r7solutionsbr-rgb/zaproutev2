import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../types';
import { Users, Search, MapPin, Phone, Mail, User, MessageCircle, ArrowLeft, Building, FileText, Save, X, Plus, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados de Paginação e Busca
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Estados de Modal e Seleção (Mantidos)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [formData, setFormData] = useState<Partial<Customer>>({ addressDetails: {} });
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState(''); 
  const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Debounce da busca (espera parar de digitar para chamar API)
  useEffect(() => {
      const timer = setTimeout(() => {
          setPage(1); // Reseta para página 1 ao buscar
          setDebouncedSearch(searchTerm);
      }, 500);
      return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carregar dados
  const fetchCustomers = async () => {
     setLoading(true);
     try {
        const userStr = localStorage.getItem('zaproute_user');
        if(userStr) {
           const user = JSON.parse(userStr);
           // Chama a API com paginação
           const response = await api.customers.getAll(user.tenantId, page, 10, debouncedSearch);
           
           setCustomers(response.data);
           setTotalPages(response.meta.lastPage);
           setTotalItems(response.meta.total);
        }
     } catch (e) {
        console.error("Failed to load customers", e);
     } finally {
        setLoading(false);
     }
  };

  // Recarrega quando muda página ou busca
  useEffect(() => {
    fetchCustomers();
  }, [page, debouncedSearch]);

  // Auto-dismiss notificação
  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [notification]);


  // --- MÁSCARAS (Mantidas) ---
  const maskCNPJ = (value: string) => {
    if (!value) return "";
    const v = value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
    if (v.length > 8) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
    if (v.length > 5) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
    if (v.length > 2) return `${v.slice(0,2)}.${v.slice(2)}`;
    return v;
  };

  const maskPhone = (value: string) => {
    if (!value) return "";
    let v = value;
    if (v.startsWith("+55")) v = v.substring(3);
    v = v.replace(/\D/g, "");
    v = v.slice(0, 11);
    if (!v) return ""; 
    let s = "+55";
    if (v.length > 0) s += ` (${v.slice(0,2)}`;
    if (v.length > 2) s += `) ${v.slice(2,7)}`; // Ajuste para 9 digitos
    if (v.length > 7) s += `-${v.slice(7)}`;
    return s;
  };

  // --- AÇÕES ---
  const openCreateModal = () => {
    setFormData({
        legalName: '', tradeName: '', cnpj: '', stateRegistration: '',
        email: '', phone: '', whatsapp: '', salesperson: '',
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
        cnpj: maskCNPJ(customer.cnpj),
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
        
        const payload = { ...formData };
        if (payload.creditLimit) payload.creditLimit = Number(payload.creditLimit);
        if (!payload.location) payload.location = { lat: 0, lng: 0, address: '' };

        if (modalMode === 'CREATE') {
            const createPayload = { ...payload, tenantId: user.tenantId };
            await api.customers.create(createPayload);
            setNotification({ type: 'SUCCESS', message: 'Cliente cadastrado com sucesso!' });
        } else {
            if (formData.id) {
                await api.customers.update(formData.id, payload);
                // Se estiver editando o selecionado, atualiza a view de detalhe
                if (selectedCustomer && selectedCustomer.id === formData.id) {
                    setSelectedCustomer({ ...selectedCustomer, ...payload } as Customer);
                }
                setNotification({ type: 'SUCCESS', message: 'Dados atualizados!' });
            }
        }
        setIsModalOpen(false);
        fetchCustomers(); // Recarrega a lista
    } catch (error) {
        console.error(error);
        setFormError('Erro ao salvar. Verifique os dados.');
    } finally {
        setModalLoading(false);
    }
  };

  // --- IMPORTAÇÃO ---
  const handleDownloadTemplate = () => { /* ... (Mantém igual ao original) ... */ };
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    
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

            // 1º PASSO: CRIAR A LISTA (customersToImport)
            // Esta variável precisa ser criada ANTES de ser usada na API
            const customersToImport = rows.map((row: any) => ({
                legalName: row['RazaoSocial'] || row['NomeFantasia'],
                tradeName: row['NomeFantasia'] || row['RazaoSocial'],
                cnpj: maskCNPJ(String(row['CNPJ'] || '')),
                email: row['Email'],
                phone: maskPhone(String(row['Telefone'] || '')),
                whatsapp: maskPhone(String(row['WhatsApp'] || row['Telefone'] || '')), 
                salesperson: row['Vendedor'],
                addressDetails: {
                    street: row['Rua'] || '', 
                    number: String(row['Numero'] || ''),
                    neighborhood: row['Bairro'] || '', 
                    city: row['Cidade'] || '',
                    state: row['Estado'] || row['UF'] || '', 
                    zipCode: String(row['CEP'] || '') 
                },
                location: {
                    lat: row['Latitude'] ? Number(row['Latitude']) : 0,
                    lng: row['Longitude'] ? Number(row['Longitude']) : 0,
                    address: `${row['Rua'] || ''}, ${row['Numero'] || ''}`
                }
            }));

            // 2º PASSO: ENVIAR PARA A API
            // Agora que 'customersToImport' existe, podemos enviá-la
            const response = await api.customers.import(user.tenantId, customersToImport);
            
            // 3º PASSO: EXIBIR MENSAGEM DO BACKEND
            setNotification({ 
                type: 'SUCCESS', 
                message: response.message || `${customersToImport.length} clientes processados.` 
            });
            
            fetchCustomers(); // Atualiza a tabela
            
        } catch (error: any) {
            console.error("Erro na importação:", error);
            setNotification({ type: 'ERROR', message: `Erro: ${error.message}` });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    reader.readAsBinaryString(file);
  };

  function handleAddressChange(field: string, value: string) {
        setFormData(prev => ({ ...prev, addressDetails: { ...prev.addressDetails, [field]: value } }));
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
        <div className="p-6 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
                    <ArrowLeft size={20} /> Voltar para Lista
                </button>
                <button onClick={() => openEditModal(selectedCustomer)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">
                    Editar Cliente
                </button>
             </div>

             {/* Notificação no Detalhe */}
             {notification && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <div className="font-bold text-sm">{notification.message}</div>
                    <button onClick={() => setNotification(null)} className="ml-auto"><X size={18}/></button>
                </div>
             )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${selectedCustomer.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200"><Building size={32} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{selectedCustomer.tradeName}</h1>
                        <p className="text-slate-500 font-medium">{selectedCustomer.legalName}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><FileText size={18} /> Dados Cadastrais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><span className="text-xs text-slate-400 uppercase font-bold">CNPJ</span><p className="font-medium text-slate-700">{selectedCustomer.cnpj}</p></div>
                            <div><span className="text-xs text-slate-400 uppercase font-bold">Vendedor</span><p className="font-medium text-slate-700 text-blue-600">{selectedCustomer.salesperson || 'N/A'}</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Phone size={18} /> Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div><span className="text-xs text-slate-400 uppercase font-bold">Telefone</span><p className="font-medium text-slate-700">{selectedCustomer.phone}</p></div>
                             <div><span className="text-xs text-slate-400 uppercase font-bold">WhatsApp</span><p className="font-medium text-green-600">{selectedCustomer.whatsapp}</p></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><MapPin size={18} /> Endereço</h3>
                    <p className="text-slate-700 font-medium">{selectedCustomer.addressDetails?.street}, {selectedCustomer.addressDetails?.number}</p>
                    <p className="text-slate-500 text-sm">{selectedCustomer.addressDetails?.neighborhood} - {selectedCustomer.addressDetails?.city}/{selectedCustomer.addressDetails?.state}</p>
                </div>
            </div>
            
            {isModalOpen && <CustomerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={modalLoading} formError={formError} maskCNPJ={maskCNPJ} maskPhone={maskPhone} handleAddressChange={handleAddressChange} handleLocationChange={handleLocationChange} />}
        </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div><h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Users className="text-blue-600" /> Clientes</h1><p className="text-slate-500 mt-1">Base de clientes ({totalItems} total).</p></div>
            
            <div className="flex gap-3 items-center">
                 {/* BUSCA SERVIDOR */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar nome ou CNPJ..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>

                <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium" disabled={isImporting}>{isImporting ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18} />} Importar</button>
                <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm"><Plus size={18} /> Novo</button>
            </div>
        </div>

        {/* NOTIFICAÇÃO GLOBAL */}
        {notification && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <div className="font-bold text-sm">{notification.message}</div>
                <button onClick={() => setNotification(null)} className="ml-auto"><X size={18}/></button>
            </div>
        )}

        {/* TABELA */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="animate-spin" /> Carregando...
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase">
                                <tr>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">CNPJ / Cidade</th>
                                    <th className="p-4">Contato</th>
                                    <th className="p-4">Vendedor</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {customers.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 group">
                                        <td className="p-4"><div className="font-bold text-slate-800 text-sm">{c.tradeName}</div><div className="text-xs text-slate-500">{c.legalName}</div></td>
                                        <td className="p-4"><div className="text-slate-600 text-sm">{c.cnpj}</div><div className="text-xs text-slate-400">{c.addressDetails?.city} - {c.addressDetails?.state}</div></td>
                                        <td className="p-4"><div className="flex items-center gap-1 text-green-600 font-medium text-sm"><MessageCircle size={14} /> {c.whatsapp}</div></td>
                                        <td className="p-4"><div className="flex items-center gap-2 text-sm"><User size={14} className="text-slate-400"/><span>{c.salesperson || '---'}</span></div></td>
                                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status === 'ACTIVE' ? 'ATIVO' : 'BLOQUEADO'}</span></td>
                                        <td className="p-4 text-right"><button onClick={() => setSelectedCustomer(c)} className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded transition-colors">Detalhes</button></td>
                                    </tr>
                                ))}
                                {customers.length === 0 && !loading && (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
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

        {isModalOpen && <CustomerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={modalLoading} formError={formError} maskCNPJ={maskCNPJ} maskPhone={maskPhone} handleAddressChange={handleAddressChange} handleLocationChange={handleLocationChange} />}
    </div>
  );
};

// (O CustomerFormModal permanece o mesmo, apenas certifique-se de que está no final do arquivo ou importado)
const CustomerFormModal = ({ isOpen, onClose, mode, data, setData, onSave, isLoading, formError, maskCNPJ, maskPhone, handleAddressChange, handleLocationChange }: any) => {
    if (!isOpen) return null;
    // ... (Código do Modal igual ao anterior)
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">{mode === 'CREATE' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
                    <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form id="customerForm" onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {/* ... Campos do Form ... */}
                         {formError && <div className="col-span-2 p-3 bg-red-50 text-red-600 rounded text-sm">{formError}</div>}
                         <div className="col-span-2 text-blue-600 font-bold border-b pb-1 mb-2">Dados</div>
                         <div><label className="text-xs font-bold text-slate-500 block">Fantasia</label><input required className="w-full border p-2 rounded" value={data.tradeName} onChange={e => setData({...data, tradeName: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">Razão Social</label><input className="w-full border p-2 rounded" value={data.legalName} onChange={e => setData({...data, legalName: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">CNPJ</label><input required className="w-full border p-2 rounded" value={data.cnpj} onChange={e => setData({...data, cnpj: maskCNPJ(e.target.value)})} maxLength={18}/></div>
                         <div><label className="text-xs font-bold text-slate-500 block">Inscrição Est.</label><input className="w-full border p-2 rounded" value={data.stateRegistration} onChange={e => setData({...data, stateRegistration: e.target.value})} /></div>
                         
                         <div className="col-span-2 text-blue-600 font-bold border-b pb-1 mb-2 mt-2">Contato</div>
                         <div><label className="text-xs font-bold text-slate-500 block">Email</label><input type="email" className="w-full border p-2 rounded" value={data.email} onChange={e => setData({...data, email: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">Telefone</label><input className="w-full border p-2 rounded" value={data.phone} onChange={e => setData({...data, phone: maskPhone(e.target.value)})} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">WhatsApp</label><input className="w-full border p-2 rounded" value={data.whatsapp} onChange={e => setData({...data, whatsapp: maskPhone(e.target.value)})} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">Vendedor</label><input className="w-full border p-2 rounded" value={data.salesperson} onChange={e => setData({...data, salesperson: e.target.value})} /></div>

                         <div className="col-span-2 text-blue-600 font-bold border-b pb-1 mb-2 mt-2">Endereço</div>
                         <div><label className="text-xs font-bold text-slate-500 block">CEP</label><input className="w-full border p-2 rounded" value={data.addressDetails?.zipCode} onChange={e => handleAddressChange('zipCode', e.target.value)} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">Cidade</label><input className="w-full border p-2 rounded" value={data.addressDetails?.city} onChange={e => handleAddressChange('city', e.target.value)} /></div>
                         <div className="col-span-2"><label className="text-xs font-bold text-slate-500 block">Rua</label><input className="w-full border p-2 rounded" value={data.addressDetails?.street} onChange={e => handleAddressChange('street', e.target.value)} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">Número</label><input className="w-full border p-2 rounded" value={data.addressDetails?.number} onChange={e => handleAddressChange('number', e.target.value)} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">Bairro</label><input className="w-full border p-2 rounded" value={data.addressDetails?.neighborhood} onChange={e => handleAddressChange('neighborhood', e.target.value)} /></div>
                         <div><label className="text-xs font-bold text-slate-500 block">UF</label><input className="w-full border p-2 rounded" value={data.addressDetails?.state} onChange={e => handleAddressChange('state', e.target.value)} maxLength={2}/></div>
                    </form>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold">Cancelar</button>
                    <button type="submit" form="customerForm" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded font-bold flex gap-2 items-center">{isLoading && <Loader2 className="animate-spin" size={16}/>} Salvar</button>
                </div>
            </div>
        </div>
    );
};