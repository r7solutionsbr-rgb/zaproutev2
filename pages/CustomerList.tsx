import React, { useState, useEffect, useRef } from 'react';
import { Delivery, Customer } from '../types';
import { Users, Search, MapPin, Phone, Mail, User, MessageCircle, ArrowLeft, Building, FileText, Save, X, Plus, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

interface CustomerListProps {
  deliveries: Delivery[]; 
}

export const CustomerList: React.FC<CustomerListProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Estados de Modal e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [formData, setFormData] = useState<Partial<Customer>>({ addressDetails: {} });
  const [isLoading, setIsLoading] = useState(false);
  
  // Novos estados para mensagens padronizadas
  const [formError, setFormError] = useState(''); 
  const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);

  // Estado de Importação
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Auto-dismiss da notificação
  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  // Função para carregar clientes
  const fetchCustomers = async () => {
     try {
        const userStr = localStorage.getItem('zaproute_user');
        if(userStr) {
           const user = JSON.parse(userStr);
           const data = await api.customers.getAll(user.tenantId);
           setCustomers(data);
        }
     } catch (e) {
        console.error("Failed to load customers", e);
     }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  );

  // --- MÁSCARAS ---
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
    if (v.startsWith("55") && v.length > 11) v = v.substring(2);
    v = v.slice(0, 11);
    if (!v) return ""; 
    let s = "+55";
    if (v.length > 0) s += ` (${v.slice(0,2)}`;
    if (v.length > 2) s += `) ${v.slice(2,6)}`;
    if (v.length > 6) s += `-${v.slice(6)}`;
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
        whatsapp: maskPhone(customer.whatsapp),
        addressDetails: customer.addressDetails || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
        location: customer.location || { lat: 0, lng: 0, address: '' }
    });
    setFormError('');
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    try {
        const userStr = localStorage.getItem('zaproute_user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        const payload = { ...formData };
        if (payload.creditLimit) payload.creditLimit = Number(payload.creditLimit);

        if (!payload.location) {
            payload.location = { lat: 0, lng: 0, address: '' };
        }

        if (modalMode === 'CREATE') {
            const createPayload = { ...payload, tenantId: user.tenantId };
            const newCustomer = await api.customers.create(createPayload);
            setCustomers([...customers, newCustomer]);
            setNotification({ type: 'SUCCESS', message: 'Cliente cadastrado com sucesso!' });
        } else {
            if (formData.id) {
                await api.customers.update(formData.id, payload);
                setCustomers(customers.map(c => c.id === formData.id ? { ...c, ...payload } as Customer : c));
                if (selectedCustomer && selectedCustomer.id === formData.id) {
                    setSelectedCustomer({ ...selectedCustomer, ...payload } as Customer);
                }
                setNotification({ type: 'SUCCESS', message: 'Dados do cliente atualizados com sucesso!' });
            }
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error(error);
        setFormError('Erro ao salvar. Verifique os dados e tente novamente.');
    } finally {
        setIsLoading(false);
    }
  };

  // --- IMPORTAÇÃO EXCEL ---
  const handleDownloadTemplate = () => {
    const exampleData = [{
        "RazaoSocial": "BANCO DO BRASIL SA", "NomeFantasia": "Praca do Carmo", "CNPJ": "00.000.000/0001-91", 
        "Email": "contato@exemplo.com", "Telefone": "8532013021", "WhatsApp": "8532013021", 
        "Vendedor": "Joao", "Rua": "Av Duque de Caxias", "Numero": "560", "Bairro": "Centro", 
        "Cidade": "Fortaleza", "Estado": "CE", "CEP": "60035110", "Latitude": -3.7322553, "Longitude": -38.5291308
    }];
    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Clientes");
    XLSX.writeFile(wb, "modelo_clientes.xlsx");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const userStr = localStorage.getItem('zaproute_user');
    const user = userStr ? JSON.parse(userStr) : {};
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (rows.length === 0) throw new Error("A planilha está vazia.");

            const customersToImport = rows.map((row: any) => ({
                legalName: row['RazaoSocial'] || row['NomeFantasia'],
                tradeName: row['NomeFantasia'] || row['RazaoSocial'],
                cnpj: maskCNPJ(String(row['CNPJ'] || '')),
                email: row['Email'],
                phone: maskPhone(String(row['Telefone'] || '')),
                whatsapp: maskPhone(String(row['WhatsApp'] || row['Telefone'] || '')), 
                salesperson: row['Vendedor'],
                addressDetails: {
                    street: row['Rua'] || '', number: String(row['Numero'] || ''),
                    neighborhood: row['Bairro'] || '', city: row['Cidade'] || '',
                    state: row['Estado'] || row['UF'] || '', zipCode: String(row['CEP'] || '') 
                },
                location: {
                    lat: row['Latitude'] ? Number(row['Latitude']) : 0,
                    lng: row['Longitude'] ? Number(row['Longitude']) : 0,
                    address: `${row['Rua'] || ''}, ${row['Numero'] || ''}`
                }
            }));

            await api.customers.import(user.tenantId, customersToImport);
            setNotification({ type: 'SUCCESS', message: `${customersToImport.length} clientes importados com sucesso!` });
            await fetchCustomers(); 
        } catch (error: any) {
            setNotification({ type: 'ERROR', message: `Erro na importação: ${error.message}` });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
  };

  const handleAddressChange = (field: string, value: string) => {
     setFormData(prev => ({ ...prev, addressDetails: { ...prev.addressDetails, [field]: value } }));
  };

  const handleLocationChange = (field: 'lat' | 'lng', value: string) => {
      setFormData(prev => ({
          ...prev,
          location: { 
              ...prev.location, lat: prev.location?.lat || 0, lng: prev.location?.lng || 0,
              address: prev.location?.address || '', [field]: Number(value) 
          }
      }));
  };

  // --- DETAIL VIEW ---
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

             {/* Notificação no modo Detalhe também */}
             {notification && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
                    notification.type === 'SUCCESS' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                    {notification.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <div className="font-bold text-sm">{notification.message}</div>
                    <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-70 hover:opacity-100"><X size={18}/></button>
                </div>
             )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${selectedCustomer.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200"><Building size={32} /></div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{selectedCustomer.tradeName}</h1>
                            <p className="text-slate-500 font-medium">{selectedCustomer.legalName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedCustomer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedCustomer.status === 'ACTIVE' ? 'ATIVO' : 'BLOQUEADO'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><FileText size={18} /> Dados Cadastrais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><span className="block text-xs text-slate-400 uppercase font-bold">CNPJ</span><p className="font-medium text-slate-700 text-lg">{selectedCustomer.cnpj}</p></div>
                            <div><span className="block text-xs text-slate-400 uppercase font-bold">Inscrição Estadual</span><p className="font-medium text-slate-700">{selectedCustomer.stateRegistration || 'ISENTO'}</p></div>
                            <div><span className="block text-xs text-slate-400 uppercase font-bold">Limite de Crédito</span><p className="text-slate-700 font-medium">R$ {selectedCustomer.creditLimit?.toFixed(2)}</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Phone size={18} /> Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div><span className="block text-xs text-slate-400 uppercase font-bold mb-1">Telefone</span><div className="flex items-center gap-2 text-slate-700"><Phone size={16} className="text-slate-400" /> {selectedCustomer.phone}</div></div>
                             <div><span className="block text-xs text-slate-400 uppercase font-bold mb-1">WhatsApp</span><div className="flex items-center gap-2 text-green-600 font-medium"><MessageCircle size={16} /> {selectedCustomer.whatsapp}</div></div>
                             <div><span className="block text-xs text-slate-400 uppercase font-bold mb-1">E-mail</span><div className="flex items-center gap-2 text-slate-700"><Mail size={16} className="text-slate-400" /> {selectedCustomer.email}</div></div>
                             <div><span className="block text-xs text-slate-400 uppercase font-bold mb-1">Vendedor</span><div className="flex items-center gap-2 text-slate-700"><User size={16} className="text-blue-500" /> {selectedCustomer.salesperson}</div></div>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><MapPin size={18} /> Endereço</h3>
                        <div className="space-y-3">
                            <p className="text-slate-700 font-medium">{selectedCustomer.addressDetails?.street}, {selectedCustomer.addressDetails?.number}</p>
                            <p className="text-slate-500 text-sm">{selectedCustomer.addressDetails?.neighborhood}</p>
                            <p className="text-slate-500 text-sm">{selectedCustomer.addressDetails?.city} - {selectedCustomer.addressDetails?.state}</p>
                            <p className="text-slate-500 text-sm font-mono mt-1">{selectedCustomer.addressDetails?.zipCode}</p>
                            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                                <div className="bg-slate-50 p-2 rounded"><span className="block text-[10px] text-slate-400 uppercase">Latitude</span><span className="font-mono text-xs">{selectedCustomer.location?.lat}</span></div>
                                <div className="bg-slate-50 p-2 rounded"><span className="block text-[10px] text-slate-400 uppercase">Longitude</span><span className="font-mono text-xs">{selectedCustomer.location?.lng}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Modal pode ser chamado do detalhe também */}
            {isModalOpen && <CustomerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={isLoading} formError={formError} maskCNPJ={maskCNPJ} maskPhone={maskPhone} handleAddressChange={handleAddressChange} handleLocationChange={handleLocationChange} />}
        </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div><h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Users className="text-blue-600" /> Clientes</h1><p className="text-slate-500 mt-1">Base de clientes.</p></div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar por Nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
                <button onClick={handleDownloadTemplate} className="p-2 text-slate-500 hover:bg-slate-100 rounded border" title="Baixar Modelo"><Download size={20} /></button>
                <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium" disabled={isImporting}>{isImporting ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18} />} Importar</button>
                <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm"><Plus size={18} /> Novo Cliente</button>
            </div>
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase">
                        <tr>
                            <th className="p-4">Cliente (Razão / Fantasia)</th>
                            <th className="p-4">CNPJ / Cidade</th>
                            <th className="p-4">Contato (WhatsApp)</th>
                            <th className="p-4">Vendedor</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 group">
                                <td className="p-4"><div className="font-bold text-slate-800 text-sm">{c.tradeName}</div><div className="text-xs text-slate-500">{c.legalName}</div></td>
                                <td className="p-4"><div className="text-slate-600 text-sm">{c.cnpj}</div><div className="text-xs text-slate-400">{c.addressDetails?.city} - {c.addressDetails?.state}</div></td>
                                <td className="p-4"><div className="flex items-center gap-1 text-green-600 font-medium text-sm"><MessageCircle size={14} /> {c.whatsapp}</div></td>
                                <td className="p-4"><div className="flex items-center gap-2 text-sm"><User size={14} className="text-slate-400"/><span>{c.salesperson}</span></div></td>
                                <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status === 'ACTIVE' ? 'ATIVO' : 'BLOQUEADO'}</span></td>
                                <td className="p-4 text-right"><button onClick={() => setSelectedCustomer(c)} className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded transition-colors">Ver / Editar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {isModalOpen && <CustomerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={isLoading} formError={formError} maskCNPJ={maskCNPJ} maskPhone={maskPhone} handleAddressChange={handleAddressChange} handleLocationChange={handleLocationChange} />}
    </div>
  );
};

const CustomerFormModal = ({ isOpen, onClose, mode, data, setData, onSave, isLoading, formError, maskCNPJ, maskPhone, handleAddressChange, handleLocationChange }: any) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b bg-slate-50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">{mode === 'CREATE' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                
                <div className="overflow-y-auto p-6">
                    <form id="customerForm" onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formError && (
                            <div className="col-span-2 mb-2 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in">
                                <AlertCircle size={18} />
                                {formError}
                            </div>
                        )}

                        <div className="col-span-2 border-b pb-2 mb-2 text-sm font-bold text-blue-600 uppercase tracking-wider">Dados Básicos</div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Fantasia</label><input required className="w-full p-2 border rounded" value={data.tradeName || ''} onChange={e => setData({...data, tradeName: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social</label><input required className="w-full p-2 border rounded" value={data.legalName || ''} onChange={e => setData({...data, legalName: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label><input required className="w-full p-2 border rounded" value={data.cnpj || ''} onChange={e => setData({...data, cnpj: maskCNPJ(e.target.value)})} placeholder="00.000.000/0000-00" maxLength={18}/></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inscrição Estadual</label><input className="w-full p-2 border rounded" value={data.stateRegistration || ''} onChange={e => setData({...data, stateRegistration: e.target.value})} /></div>

                        <div className="col-span-2 border-b pb-2 mb-2 mt-2 text-sm font-bold text-blue-600 uppercase tracking-wider">Contato</div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" className="w-full p-2 border rounded" value={data.email || ''} onChange={e => setData({...data, email: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendedor</label><input className="w-full p-2 border rounded" value={data.salesperson || ''} onChange={e => setData({...data, salesperson: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label><input className="w-full p-2 border rounded" value={data.phone || ''} onChange={e => setData({...data, phone: maskPhone(e.target.value)})} placeholder="+55 (99) 9999-9999"/></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp</label><input className="w-full p-2 border rounded" value={data.whatsapp || ''} onChange={e => setData({...data, whatsapp: maskPhone(e.target.value)})} placeholder="+55 (99) 99999-9999"/></div>

                        <div className="col-span-2 border-b pb-2 mb-2 mt-2 text-sm font-bold text-blue-600 uppercase tracking-wider">Endereço & Localização</div>
                        <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label><input className="w-full p-2 border rounded" value={data.addressDetails?.zipCode || ''} onChange={e => handleAddressChange('zipCode', e.target.value)} /></div>
                        <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade</label><input className="w-full p-2 border rounded" value={data.addressDetails?.city || ''} onChange={e => handleAddressChange('city', e.target.value)} /></div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rua / Logradouro</label><input className="w-full p-2 border rounded" value={data.addressDetails?.street || ''} onChange={e => handleAddressChange('street', e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label><input className="w-full p-2 border rounded" value={data.addressDetails?.number || ''} onChange={e => handleAddressChange('number', e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label><input className="w-full p-2 border rounded" value={data.addressDetails?.neighborhood || ''} onChange={e => handleAddressChange('neighborhood', e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado (UF)</label><input className="w-full p-2 border rounded" value={data.addressDetails?.state || ''} onChange={e => handleAddressChange('state', e.target.value)} maxLength={2}/></div>
                        
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Latitude</label><input type="number" step="any" className="w-full p-2 border rounded bg-slate-50" value={data.location?.lat || 0} onChange={e => handleLocationChange('lat', e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Longitude</label><input type="number" step="any" className="w-full p-2 border rounded bg-slate-50" value={data.location?.lng || 0} onChange={e => handleLocationChange('lng', e.target.value)} /></div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Limite Crédito</label><input type="number" className="w-full p-2 border rounded" value={data.creditLimit || ''} onChange={e => setData({...data, creditLimit: e.target.value})} /></div>
                    </form>
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold">Cancelar</button>
                    <button type="submit" form="customerForm" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2">{isLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />} {mode === 'CREATE' ? 'Cadastrar' : 'Salvar'}</button>
                </div>
            </div>
        </div>
    );
};