import React, { useState, useEffect, useRef } from 'react';
import { Vehicle, Driver } from '../types';
import { Truck, Search, Wrench, Fuel, ArrowLeft, Settings, Save, X, Plus, Download, FileSpreadsheet, Loader2, Calendar } from 'lucide-react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

interface VehicleListProps {
  vehicles: Vehicle[];
  drivers: Driver[];
}

export const VehicleList: React.FC<VehicleListProps> = ({ vehicles: initialVehicles, drivers }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Estados de Modal e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Estado de Importação
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => { setVehicles(initialVehicles); }, [initialVehicles]);

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentDriver = (vehicleId: string) => {
    const driver = drivers.find(d => d.vehicleId === vehicleId);
    return driver ? driver.name : 'Disponível';
  };

  // --- MÁSCARA DE PLACA ---
  const maskPlate = (value: string) => {
    if (!value) return "";
    
    // Remove tudo que não é letra ou número e força maiúsculo
    let v = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    
    // Limita a 7 caracteres (Padrão Mercosul/Antigo sem traço)
    v = v.slice(0, 7);

    // Aplica o traço apenas se for o padrão antigo (3 letras + números)
    // Regex: 3 letras seguidas de 1 ou mais números
    if (v.match(/^[A-Z]{3}[0-9]+$/) && v.length > 3) {
        return `${v.slice(0,3)}-${v.slice(3)}`;
    }

    return v;
  };

  // --- AÇÕES ---

  const openCreateModal = () => {
    setFormData({
        plate: '', model: '', brand: '', year: new Date().getFullYear(),
        capacityWeight: 0, capacityVolume: 0, fuelType: 'DIESEL',
        status: 'AVAILABLE', lastMaintenance: new Date().toISOString(), nextMaintenance: ''
    });
    setModalMode('CREATE');
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setFormData({ ...vehicle });
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        const userStr = localStorage.getItem('zaproute_user');
        const user = userStr ? JSON.parse(userStr) : null;

        // Limpar máscara da placa para salvar puro se necessário, ou manter formatado.
        // Aqui mantemos a máscara visual se for o padrão antigo, ou puro se for Mercosul
        const payload = { ...formData };
        
        // Conversão de tipos numéricos
        if (payload.year) payload.year = Number(payload.year);
        if (payload.capacityWeight) payload.capacityWeight = Number(payload.capacityWeight);
        if (payload.capacityVolume) payload.capacityVolume = Number(payload.capacityVolume);

        // Datas
        if (payload.lastMaintenance) payload.lastMaintenance = new Date(payload.lastMaintenance).toISOString();
        if (payload.nextMaintenance) payload.nextMaintenance = new Date(payload.nextMaintenance).toISOString();

        if (modalMode === 'CREATE') {
            const createPayload = { ...payload, tenantId: user.tenantId };
            const newVehicle = await api.vehicles.create(createPayload);
            setVehicles([...vehicles, newVehicle]);
            alert('Veículo criado com sucesso!');
        } else {
            if (formData.id) {
                await api.vehicles.update(formData.id, payload);
                setVehicles(vehicles.map(v => v.id === formData.id ? { ...v, ...payload } as Vehicle : v));
                
                if (selectedVehicle && selectedVehicle.id === formData.id) {
                    setSelectedVehicle({ ...selectedVehicle, ...payload } as Vehicle);
                }
                alert('Veículo atualizado com sucesso!');
            }
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar veículo.');
    } finally {
        setIsLoading(false);
    }
  };

  // --- IMPORTAÇÃO EXCEL ---

  const handleDownloadTemplate = () => {
    const exampleData = [{
        "Placa": "ABC-1234", "Modelo": "Fiorino", "Marca": "Fiat", "Ano": 2022,
        "CapacidadeKg": 650, "CapacidadeM3": 3.3, "Combustivel": "FLEX"
    }];
    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Veiculos");
    XLSX.writeFile(wb, "modelo_veiculos.xlsx");
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
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) throw new Error("Planilha vazia.");

            const vehiclesToImport = rows.map((row: any) => ({
                plate: maskPlate(String(row['Placa'] || '')),
                model: String(row['Modelo'] || ''),
                brand: String(row['Marca'] || ''),
                year: row['Ano'] || new Date().getFullYear(),
                capacityWeight: row['CapacidadeKg'] || 0,
                capacityVolume: row['CapacidadeM3'] || 0,
                fuelType: String(row['Combustivel'] || 'DIESEL').toUpperCase(),
                // Datas default
                lastMaintenance: new Date().toISOString(),
                nextMaintenance: null
            }));

            await api.vehicles.import(user.tenantId, vehiclesToImport);
            alert(`${vehiclesToImport.length} veículos processados! Recarregando...`);
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert("Erro na importação do Excel.");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  // --- DETALHES ---
  if (selectedVehicle) {
      const currentDriver = drivers.find(d => d.vehicleId === selectedVehicle.id);
      return (
        <div className="p-6 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={() => setSelectedVehicle(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium"
                >
                    <ArrowLeft size={20} /> Voltar para Lista
                </button>
                
                <button 
                    onClick={() => openEditModal(selectedVehicle)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm"
                >
                    Editar Veículo
                </button>
             </div>

            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4 w-full">
                    <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                        <Truck size={40} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 font-mono tracking-tight">{selectedVehicle.plate}</h1>
                        <p className="text-slate-500 font-medium">{selectedVehicle.brand} {selectedVehicle.model}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                         selectedVehicle.status === 'IN_USE' ? 'bg-blue-100 text-blue-700' :
                         selectedVehicle.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                         'bg-red-100 text-red-700'
                    }`}>
                        {selectedVehicle.status === 'IN_USE' ? 'EM OPERAÇÃO' : selectedVehicle.status === 'AVAILABLE' ? 'DISPONÍVEL' : 'MANUTENÇÃO'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                            <Settings size={18} /> Ficha Técnica
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                             <div>
                                <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Ano</span>
                                <p className="font-medium text-slate-700">{selectedVehicle.year}</p>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Capacidade (Kg)</span>
                                <p className="font-medium text-slate-700">{selectedVehicle.capacityWeight} kg</p>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Capacidade (m³)</span>
                                <p className="font-medium text-slate-700">{selectedVehicle.capacityVolume} m³</p>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Combustível</span>
                                <div className="flex items-center gap-1">
                                    <Fuel size={16} className="text-slate-400" />
                                    <span className="font-medium text-slate-700">{selectedVehicle.fuelType}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                            <Wrench size={18} /> Manutenção
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <span className="block text-xs text-green-700 uppercase font-bold mb-1">Última Revisão</span>
                                <div className="flex items-center gap-2 text-green-800 text-lg font-bold">
                                    <Calendar size={20} /> {selectedVehicle.lastMaintenance ? new Date(selectedVehicle.lastMaintenance).toLocaleDateString('pt-BR') : '--'}
                                </div>
                             </div>
                             <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <span className="block text-xs text-yellow-700 uppercase font-bold mb-1">Próxima (Prevista)</span>
                                <div className="flex items-center gap-2 text-yellow-800 text-lg font-bold">
                                    <Calendar size={20} /> {selectedVehicle.nextMaintenance ? new Date(selectedVehicle.nextMaintenance).toLocaleDateString('pt-BR') : '--'}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                            <Truck size={18} /> Condutor Atual
                        </h3>
                        <div className="text-center p-4">
                            {currentDriver ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto mb-3 overflow-hidden border border-slate-200">
                                        <img src={currentDriver.avatarUrl} alt="" className="w-full h-full object-cover"/>
                                    </div>
                                    <p className="font-bold text-slate-800">{currentDriver.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">Em turno</p>
                                </>
                            ) : (
                                <div className="text-slate-400 py-4">
                                    <p>Veículo parado no pátio</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DENTRO DO DETALHE (Para editar direto daqui) */}
            {isModalOpen && <VehicleFormModal 
                isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
                mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={isLoading} 
                maskPlate={maskPlate}
            />}
        </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <Truck className="text-blue-600" /> Frota de Veículos
                </h1>
                <p className="text-slate-500 mt-1">Controle da frota própria e agregada.</p>
            </div>
            <div className="flex gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por Placa..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex gap-2">
                    <button onClick={handleDownloadTemplate} className="p-2 text-slate-500 hover:bg-slate-100 rounded border" title="Baixar Modelo">
                        <Download size={20} />
                    </button>
                    
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                        disabled={isImporting}
                    >
                        {isImporting ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18} />}
                        Importar
                    </button>

                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm"
                    >
                        <Plus size={18} /> Novo Veículo
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                            <th className="p-4">Placa / Modelo</th>
                            <th className="p-4">Ano</th>
                            <th className="p-4">Capacidade</th>
                            <th className="p-4">Combustível</th>
                            <th className="p-4">Condutor</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredVehicles.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50 group">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800 font-mono">{v.plate}</div>
                                    <div className="text-xs text-slate-500">{v.brand} {v.model}</div>
                                </td>
                                <td className="p-4">
                                    <span className="text-slate-600">{v.year}</span>
                                </td>
                                <td className="p-4">
                                    <div className="text-xs">
                                        <div>{v.capacityWeight} kg</div>
                                        <div className="text-slate-400">{v.capacityVolume} m³</div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="text-slate-600 text-xs font-medium border border-slate-200 px-2 py-0.5 rounded bg-slate-50">{v.fuelType}</span>
                                </td>
                                <td className="p-4">
                                    <span className="text-slate-700">{getCurrentDriver(v.id)}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                        v.status === 'IN_USE' ? 'bg-blue-100 text-blue-700' :
                                        v.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {v.status === 'IN_USE' ? 'EM USO' : v.status === 'AVAILABLE' ? 'DISPONÍVEL' : 'MANUTENÇÃO'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => setSelectedVehicle(v)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                                    >
                                        Ver / Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {isModalOpen && <VehicleFormModal 
            isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
            mode={modalMode} data={formData} setData={setFormData} onSave={handleSave} isLoading={isLoading} 
            maskPlate={maskPlate}
        />}
    </div>
  );
};

// Subcomponente do Modal para limpar o código principal
const VehicleFormModal = ({ isOpen, onClose, mode, data, setData, onSave, isLoading, maskPlate }: any) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">
                        {mode === 'CREATE' ? 'Novo Veículo' : 'Editar Veículo'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={onSave} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Placa</label>
                        <input 
                            required 
                            className="w-full p-2 border rounded font-mono uppercase" 
                            value={data.plate || ''} 
                            onChange={e => setData({...data, plate: maskPlate(e.target.value)})}
                            maxLength={8}
                            placeholder="ABC-1234"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca</label>
                        <input required className="w-full p-2 border rounded" value={data.brand || ''} onChange={e => setData({...data, brand: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo</label>
                        <input required className="w-full p-2 border rounded" value={data.model || ''} onChange={e => setData({...data, model: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ano</label>
                        <input type="number" required className="w-full p-2 border rounded" value={data.year || ''} onChange={e => setData({...data, year: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacidade (Kg)</label>
                        <input type="number" className="w-full p-2 border rounded" value={data.capacityWeight || ''} onChange={e => setData({...data, capacityWeight: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacidade (m³)</label>
                        <input type="number" className="w-full p-2 border rounded" value={data.capacityVolume || ''} onChange={e => setData({...data, capacityVolume: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Combustível</label>
                        <select className="w-full p-2 border rounded" value={data.fuelType || 'DIESEL'} onChange={e => setData({...data, fuelType: e.target.value})}>
                            <option value="DIESEL">Diesel</option>
                            <option value="GASOLINE">Gasolina</option>
                            <option value="FLEX">Flex</option>
                            <option value="ELECTRIC">Elétrico</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                        <select className="w-full p-2 border rounded" value={data.status || 'AVAILABLE'} onChange={e => setData({...data, status: e.target.value})}>
                            <option value="AVAILABLE">Disponível</option>
                            <option value="IN_USE">Em Uso</option>
                            <option value="MAINTENANCE">Manutenção</option>
                        </select>
                    </div>

                    <div className="col-span-3 flex justify-end gap-3 mt-4 border-t pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            {mode === 'CREATE' ? 'Cadastrar' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};