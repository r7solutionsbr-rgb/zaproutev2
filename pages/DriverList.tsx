import React, { useState, useEffect, useRef } from 'react';
import { Driver, Vehicle } from '../types';
import { UserCircle, Search, Phone, Mail, Truck, Edit2, Plus, Upload, X, Save, Download, FileSpreadsheet, Loader2, CreditCard, Star, ArrowLeft, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

interface DriverListProps {
  drivers: Driver[];
  vehicles: Vehicle[];
}

export const DriverList: React.FC<DriverListProps> = ({ drivers: initialDrivers, vehicles }) => {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  // Estado do Modal (Criar/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [formData, setFormData] = useState<Partial<Driver>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Estado de Notificação Global
  const [notification, setNotification] = useState<{ type: 'SUCCESS' | 'ERROR', message: string } | null>(null);

  // Estado de Importação
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => { setDrivers(initialDrivers); }, [initialDrivers]);

  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cpf.includes(searchTerm) ||
    d.cnh.includes(searchTerm)
  );

  const getVehicleInfo = (vehicleId: string | null) => {
    if (!vehicleId) return 'Sem Veículo';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate})` : 'Desconhecido';
  };

  // --- HELPER: VERIFICAR VALIDADE CNH ---
  const isCnhExpired = (dateString: string | Date) => {
      if (!dateString) return false;
      const expiration = new Date(dateString);
      const today = new Date();
      // Zera as horas para comparar apenas as datas
      today.setHours(0, 0, 0, 0);
      expiration.setHours(0, 0, 0, 0);
      return expiration < today;
  };

  // --- HELPER: CATEGORIAS CNH ---
  const availableCategories = ['A', 'B', 'C', 'D', 'E'];

  const toggleCategory = (cat: string) => {
      let currentCats = formData.cnhCategory || '';
      // Remove espaços e garante uppercase
      currentCats = currentCats.replace(/\s/g, '').toUpperCase();
      
      let newCats = '';
      if (currentCats.includes(cat)) {
          newCats = currentCats.replace(cat, '');
      } else {
          newCats = currentCats + cat;
      }
      // Ordena para ficar bonito (ex: "AB" em vez de "BA")
      newCats = newCats.split('').sort().join('');
      setFormData({ ...formData, cnhCategory: newCats });
  };

  // --- MÁSCARAS ---
  const maskCPF = (value: string) => {
    if (!value) return "";
    const v = value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
    if (v.length > 6) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    if (v.length > 3) return `${v.slice(0,3)}.${v.slice(3)}`;
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
    if (v.length > 2) s += `) ${v.slice(2,7)}`;
    if (v.length > 7) s += `-${v.slice(7)}`;
    return s;
  };

  // --- HANDLERS ---

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            setFormError("A imagem é muito grande. Máximo 2MB.");
            return;
        }
        setFormError('');
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const openCreateModal = () => {
    setFormData({
        name: '', cpf: '', cnh: '', cnhCategory: 'B', 
        cnhExpiration: new Date().toISOString().split('T')[0], 
        phone: '', email: '', rating: 5, totalDeliveries: 0,
        avatarUrl: '', status: 'IDLE' // Default status
    });
    setFormError('');
    setModalMode('CREATE');
    setIsModalOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    const dateStr = new Date(driver.cnhExpiration).toISOString().split('T')[0];
    setFormData({ 
        ...driver, 
        cnhExpiration: dateStr,
        cpf: maskCPF(driver.cpf),
        phone: maskPhone(driver.phone),
        avatarUrl: driver.avatarUrl || ''
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
        if (payload.cnhExpiration) payload.cnhExpiration = new Date(payload.cnhExpiration as string).toISOString();

        if (!payload.avatarUrl) {
            payload.avatarUrl = `https://ui-avatars.com/api/?name=${payload.name}&background=random`;
        }

        // Garante que se nenhuma categoria for selecionada, salve pelo menos B ou vazio
        if (!payload.cnhCategory) payload.cnhCategory = 'B';

        if (modalMode === 'CREATE') {
            const createPayload = { ...payload, tenantId: user.tenantId };
            const newDriver = await api.drivers.create(createPayload);
            setDrivers([...drivers, newDriver]);
            setNotification({ type: 'SUCCESS', message: 'Motorista cadastrado com sucesso!' });
        } else {
            if (formData.id) {
                await api.drivers.update(formData.id, payload);
                setDrivers(drivers.map(d => d.id === formData.id ? { ...d, ...payload } as Driver : d));
                
                if (selectedDriver && selectedDriver.id === formData.id) {
                    setSelectedDriver({ ...selectedDriver, ...payload } as Driver);
                }
                setNotification({ type: 'SUCCESS', message: 'Perfil atualizado com sucesso!' });
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

  // --- IMPORTAÇÃO ---
  const handleDownloadTemplate = () => {
    const exampleData = [{ "Nome": "João Silva", "CPF": "123.456.789-00", "CNH": "12345678900", "Categoria": "AB", "Validade": "2028-01-01", "Telefone": "(85) 99999-8888", "Email": "joao@exemplo.com" }];
    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Motoristas");
    XLSX.writeFile(wb, "modelo_motoristas.xlsx");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const userStr = localStorage.getItem('zaproute_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (rows.length === 0) throw new Error("Planilha vazia.");
            const driversToImport = rows.map((row: any) => ({
                name: row['Nome'], cpf: maskCPF(String(row['CPF']||'')), cnh: String(row['CNH']||''),
                cnhCategory: String(row['Categoria']||'B'), cnhExpiration: row['Validade']||new Date().toISOString(),
                phone: maskPhone(String(row['Telefone']||'')), email: row['Email']
            }));
            await api.drivers.import(user.tenantId, driversToImport);
            setNotification({ type: 'SUCCESS', message: `${driversToImport.length} motoristas importados com sucesso!` });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) { 
            setNotification({ type: 'ERROR', message: 'Erro ao processar arquivo Excel.' });
        } 
        finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  // --- VIEW: DETALHE ---
  if (selectedDriver) {
      const expired = isCnhExpired(selectedDriver.cnhExpiration);
      return (
        <div className="p-6 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <button onClick={() => setSelectedDriver(null)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium"><ArrowLeft size={20} /> Voltar para Lista</button>
                <button onClick={() => openEditModal(selectedDriver)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">Editar Perfil</button>
             </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${selectedDriver.status === 'ON_ROUTE' ? 'bg-blue-500' : selectedDriver.status === 'IDLE' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-100">
                            <img src={selectedDriver.avatarUrl} alt={selectedDriver.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{selectedDriver.name}</h1>
                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                <span>{selectedDriver.rating?.toFixed(1)}</span>
                                <span className="text-slate-300">|</span>
                                <span>{selectedDriver.totalDeliveries} Entregas</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${
                             selectedDriver.status === 'ON_ROUTE' ? 'bg-blue-100 text-blue-700' :
                             selectedDriver.status === 'IDLE' ? 'bg-green-100 text-green-700' :
                             'bg-slate-100 text-slate-500'
                        }`}>
                            {selectedDriver.status === 'ON_ROUTE' ? 'EM ROTA' : selectedDriver.status === 'IDLE' ? 'DISPONÍVEL' : 'OFFLINE'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><CreditCard size={18} /> Documentação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><span className="text-xs text-slate-400 font-bold block">CPF</span>{selectedDriver.cpf}</div>
                            <div><span className="text-xs text-slate-400 font-bold block">CNH</span>{selectedDriver.cnh}</div>
                            <div><span className="text-xs text-slate-400 font-bold block">Categoria</span>{selectedDriver.cnhCategory}</div>
                            <div>
                                <span className="text-xs text-slate-400 font-bold block">Validade</span>
                                <div className={`flex items-center gap-2 font-medium ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                                     {new Date(selectedDriver.cnhExpiration).toLocaleDateString('pt-BR')}
                                     {expired && <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={12}/> VENCIDA</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Phone size={18} /> Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div><span className="text-xs text-slate-400 font-bold block">Celular</span>{selectedDriver.phone}</div>
                             <div><span className="text-xs text-slate-400 font-bold block">Email</span>{selectedDriver.email}</div>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Truck size={18} /> Veículo Atual</h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                            {selectedDriver.vehicleId ? (
                                <>
                                    <Truck size={32} className="mx-auto text-blue-500 mb-2" />
                                    <p className="font-bold text-slate-800 text-lg">{getVehicleInfo(selectedDriver.vehicleId)}</p>
                                    <p className="text-xs text-slate-400 uppercase mt-1">Vinculado para hoje</p>
                                </>
                            ) : (
                                <>
                                    <Truck size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-slate-500">Nenhum veículo vinculado</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- VIEW: LISTA ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><UserCircle className="text-blue-600" /> Motoristas</h1>
            <div className="flex gap-3">
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-4 pr-4 py-2 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleDownloadTemplate} className="p-2 text-slate-500 hover:bg-slate-100 rounded border"><Download size={20} /></button>
                <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg font-medium">{isImporting ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18} />} Importar</button>
                <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm"><Plus size={18} /> Novo</button>
            </div>
        </div>

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
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr><th className="p-4">Nome</th><th className="p-4">CNH / Cat</th><th className="p-4">Veículo</th><th className="p-4">Validade CNH</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredDrivers.map(d => {
                        const expired = isCnhExpired(d.cnhExpiration);
                        return (
                            <tr key={d.id} className="hover:bg-slate-50 group">
                                <td className="p-4 flex items-center gap-3">
                                    <img src={d.avatarUrl} alt="" className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
                                    <div><div className="font-bold text-slate-800">{d.name}</div><div className="text-xs text-slate-400">{d.cpf}</div></div>
                                </td>
                                <td className="p-4">{d.cnh} <span className="text-xs bg-slate-100 px-1 rounded font-bold">{d.cnhCategory}</span></td>
                                <td className="p-4"><span className="text-slate-600">{getVehicleInfo(d.vehicleId)}</span></td>
                                <td className="p-4">
                                    <div className={`flex items-center gap-2 ${expired ? 'text-red-600 font-bold' : ''}`}>
                                        {new Date(d.cnhExpiration).toLocaleDateString('pt-BR')}
                                        {expired && <AlertCircle size={16} title="CNH Vencida" />}
                                    </div>
                                </td>
                                <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${d.status === 'ON_ROUTE' ? 'bg-blue-100 text-blue-700' : d.status === 'IDLE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{d.status === 'ON_ROUTE' ? 'EM ROTA' : d.status === 'IDLE' ? 'DISPONÍVEL' : 'OFFLINE'}</span></td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => openEditModal(d)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit2 size={18} /></button>
                                    <button onClick={() => setSelectedDriver(d)} className="text-slate-400 hover:bg-slate-50 p-2 rounded transition-colors"><ArrowLeft size={18} className="rotate-180" /></button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* MODAL DE EDIÇÃO/CRIAÇÃO */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-800">{modalMode === 'CREATE' ? 'Novo Motorista' : 'Editar Motorista'}</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    </div>
                    
                    <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formError && (
                            <div className="col-span-2 mb-2 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in">
                                <AlertCircle size={18} />{formError}
                            </div>
                        )}

                        {/* FOTO DE PERFIL (UPLOAD) */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto de Perfil</label>
                            <div className="flex gap-4 items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                                <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm relative group">
                                    {formData.avatarUrl ? <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" /> : <UserCircle className="text-slate-300 w-8 h-8" />}
                                </div>
                                <div className="flex-1">
                                    <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Recomendado: JPG ou PNG (Max 2MB).</p>
                                </div>
                                {formData.avatarUrl && (
                                    <button type="button" onClick={() => setFormData({...formData, avatarUrl: ''})} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors" title="Remover foto"><X size={18} /></button>
                                )}
                            </div>
                        </div>

                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input required className="w-full p-2 border rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        
                        {/* MULTI-SELECT CATEGORIAS */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categorias da CNH</label>
                            <div className="flex gap-2">
                                {availableCategories.map(cat => {
                                    const isSelected = formData.cnhCategory?.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => toggleCategory(cat)}
                                            className={`w-10 h-10 rounded-lg font-bold border transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Selecionado: {formData.cnhCategory || 'Nenhuma'}</p>
                        </div>

                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNH</label><input required className="w-full p-2 border rounded" value={formData.cnh || ''} onChange={e => setFormData({...formData, cnh: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Validade CNH</label><input type="date" required className="w-full p-2 border rounded" value={formData.cnhExpiration ? String(formData.cnhExpiration) : ''} onChange={e => setFormData({...formData, cnhExpiration: e.target.value})} /></div>
                        
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label><input required className="w-full p-2 border rounded" value={formData.cpf || ''} onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})} maxLength={14}/></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label><input required className="w-full p-2 border rounded" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} maxLength={19}/></div>
                        
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" required className="w-full p-2 border rounded" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>

                        {/* SELECT DE STATUS */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status do Motorista</label>
                            <select className="w-full p-2 border rounded" value={formData.status || 'IDLE'} onChange={e => setFormData({...formData, status: e.target.value})}>
                                <option value="IDLE">🟢 Disponível (Aguardando)</option>
                                <option value="ON_ROUTE">🔵 Em Rota (Trabalhando)</option>
                                <option value="OFFLINE">⚫ Indisponível / Férias / Offline</option>
                            </select>
                        </div>

                        <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold">Cancelar</button>
                            <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2">
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                {modalMode === 'CREATE' ? 'Cadastrar' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};