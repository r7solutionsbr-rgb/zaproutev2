import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as XLSX from 'xlsx';

// Importação segura do PDF.js
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker (Essencial para não travar a tela)
if (typeof window !== 'undefined') {
    // Usa o worker da versão instalada via unpkg para garantir compatibilidade
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

import { Delivery, Route, Driver, Vehicle, DeliveryStatus } from '../types';
import { 
  FileSpreadsheet, Truck, Calendar, Package, Navigation, 
  Download, Loader2, Filter, Check, Edit, Trash2, 
  AlertTriangle, CheckCircle, X, Info, Save, Lock, User, XCircle, Map as MapIcon, MapPin, FileText
} from 'lucide-react';
import { api } from '../services/api';

// --- ÍCONES DO MAPA ---
const createIcon = (color: string) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const icons = {
    blue: createIcon('blue'),
    green: createIcon('green'),
    red: createIcon('red'),
    grey: createIcon('grey')
};

// --- PARSER PDF (DIÁRIO DE VIAGEM) ---
const parseTetraOilPdf = async (arrayBuffer: ArrayBuffer) => {
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // Une sem espaço para manter o formato "CSV" intacto (ex: "A","B")
        const strings = textContent.items.map((item: any) => item.str);
        fullText += strings.join("") + "\n"; 
    }

    // 1. Cabeçalho
    const driverMatch = fullText.match(/Motorista:\s*([A-Z\s]+)/i);
    const vehicleMatch = fullText.match(/Veículo:\s*([A-Z0-9]+)/i);
    
    const driverName = driverMatch ? driverMatch[1].trim() : "";
    const vehiclePlate = vehicleMatch ? vehicleMatch[1].trim() : "";
    const routeDate = new Date().toISOString(); 
    
    const routeData = {
        name: `Rota PDF - ${vehiclePlate} - ${driverName.split(' ')[0] || 'Diário'}`,
        date: routeDate,
        vehiclePlate,
        driverName
    };

    const deliveries: any[] = [];

    // 2. Regex para o Padrão "CSV Visual" do seu PDF
    // Procura: "123456", "CLIENTE...", "CIDADE", "VENDEDOR", "PRODUTO", ... "QTD"
    // [\s\S]*? permite capturar quebras de linha dentro das aspas
    const rowRegex = /"(\d+)"\s*,\s*"([\s\S]*?)"\s*,\s*"([\s\S]*?)"\s*,\s*"([\s\S]*?)"\s*,\s*"([\s\S]*?)"[\s\S]*?"([\d\.]+,\d{2})/g;

    let match;
    while ((match = rowRegex.exec(fullText)) !== null) {
        const invoice = match[1];          
        const rawClient = match[2] || "";  
        const city = match[3].replace(/[\r\n]+/g, ' ').trim();       
        const salesperson = match[4].replace(/[\r\n]+/g, ' ').trim(); 
        const product = match[5].replace(/[\r\n]+/g, ' ').trim();     
        const qtdStr = match[6];           

        // Separação Nome/Endereço (Baseado na quebra de linha dentro das aspas)
        let customerName = "Cliente Desconhecido";
        let customerAddress = "Endereço não informado";

        if (rawClient.trim() !== "") {
            const cleanClient = rawClient.replace(/\r\n/g, '\n').trim();
            const parts = cleanClient.split('\n');

            if (parts.length > 1) {
                customerName = parts[0].trim(); // 1ª Linha = Nome
                customerAddress = parts.slice(1).join(" ").trim(); // Resto = Endereço
            } else {
                // Se não tiver quebra de linha, tenta ver se tem vírgula
                if(cleanClient.includes(',')) {
                   const commaParts = cleanClient.split(',');
                   customerName = commaParts[0];
                   customerAddress = cleanClient;
                } else {
                   customerName = cleanClient;
                   customerAddress = cleanClient;
                }
            }
        }

        const fullAddress = `${customerAddress} - ${city}`;

        deliveries.push({
            invoiceNumber: invoice,
            customerName: customerName,
            customerCnpj: "", 
            customerAddress: fullAddress, 
            volume: parseFloat(qtdStr.replace('.', '').replace(',', '.')),
            weight: 0,
            value: 0,
            priority: 'NORMAL',
            product: product,
            salesperson: salesperson
        });
    }

    if (deliveries.length === 0) {
        // Fallback: Tenta buscar sem as aspas caso o PDF mude (formato texto simples)
        if (fullText.includes("Pedido") && fullText.includes("Cliente")) {
             throw new Error("Layout detectado, mas a leitura falhou. O PDF pode ter caracteres especiais não reconhecidos.");
        }
        throw new Error("Nenhum pedido identificado.");
    }

    return { routeData, deliveries };
};

// --- COMPONENTE RECENTER ---
const RecenterMap = ({ points }: { points: { lat: number, lng: number }[] }) => {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            try {
                const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
                if(bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
            } catch(e) {}
        }
    }, [points, map]);
    return null;
};

// --- MODAIS ---

const ImportResultModal = ({ isOpen, onClose, results }: any) => {
  if (!isOpen) return null;
  const hasErrors = results.errors.length > 0;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-6 border-b ${hasErrors ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${hasErrors ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {hasErrors ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
            </div>
            <div>
              <h3 className={`text-lg font-bold ${hasErrors ? 'text-red-900' : 'text-green-900'}`}>
                {hasErrors ? 'Importação com Pendências' : 'Sucesso Total!'}
              </h3>
              <p className={`text-sm ${hasErrors ? 'text-red-600' : 'text-green-600'}`}>Processamento finalizado.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-green-50 border border-green-100 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-green-700">{results.success}</div>
              <div className="text-xs font-bold text-green-600 uppercase">Importadas</div>
            </div>
            <div className="flex-1 bg-red-50 border border-red-100 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-red-700">{results.errors.length}</div>
              <div className="text-xs font-bold text-red-600 uppercase">Falhas</div>
            </div>
          </div>
          {hasErrors && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Info size={16} className="text-red-500" /> Detalhes dos Erros:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-sm max-h-60 overflow-y-auto">
                {results.errors.map((err: any, idx: number) => (
                  <div key={idx} className="p-3 border-b border-slate-100 last:border-0 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="font-bold text-slate-800 mb-1">Rota: "{err.route}"</div>
                    <div className="text-red-600 text-xs flex items-start gap-1">
                      <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                      {err.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!hasErrors && (
             <div className="text-center py-4 text-slate-500">
                <CheckCircle size={48} className="mx-auto mb-2 text-green-200" />
                <p>Todas as rotas foram processadas corretamente.</p>
             </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold shadow-sm">Fechar e Atualizar</button>
        </div>
      </div>
    </div>
  );
};

const DeliveryActionModal = ({ isOpen, onClose, onConfirm, type, delivery }: any) => {
  if (!isOpen) return null;
  const isDeliver = type === 'DELIVER';
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`p-6 border-b ${isDeliver ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} flex justify-between items-center`}>
          <h3 className={`text-xl font-bold ${isDeliver ? 'text-green-800' : 'text-red-800'} flex items-center gap-2`}>
            {isDeliver ? <CheckCircle size={24} /> : <XCircle size={24} />}
            {isDeliver ? 'Confirmar Entrega' : 'Registrar Falha'}
          </h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" size={20}/></button>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm">
            Você está prestes a alterar o status da nota <strong>{delivery.invoiceNumber}</strong> ({delivery.customer.tradeName}).
          </p>
          <p className={`mt-3 font-bold ${isDeliver ? 'text-green-600' : 'text-red-600'}`}>
            Ação: {isDeliver ? 'MARCAR COMO ENTREGUE' : 'MARCAR COMO FALHA/DEVOLUÇÃO'}
          </p>
        </div>
        <div className={`p-4 border-t border-slate-100 ${isDeliver ? 'bg-green-50' : 'bg-red-50'} flex justify-end gap-2`}>
           <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-white/50 rounded-lg text-sm">Cancelar</button>
           <button onClick={onConfirm} className={`px-6 py-2 text-white rounded-lg font-bold shadow-sm flex items-center gap-2 text-sm transition-colors ${isDeliver ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {isDeliver ? <Check size={16} /> : <AlertTriangle size={16} />}
              Confirmar
           </button>
        </div>
      </div>
    </div>
  );
};

const EditRouteModal = ({ isOpen, onClose, onSave, route, drivers, vehicles }: any) => {
  const [formData, setFormData] = useState<Partial<Route>>({});
  useEffect(() => {
    if (isOpen && route) {
      setFormData({
        name: route.name, driverId: route.driverId, vehicleId: route.vehicleId, status: route.status,
        date: route.date ? new Date(route.date).toISOString().split('T')[0] : ''
      });
    }
  }, [isOpen, route]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Edit size={20} className="text-blue-600"/> Editar Rota</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome</label><input className="w-full p-2 border rounded-lg" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-sm font-bold text-slate-700 mb-1">Data</label><input type="date" className="w-full p-2 border rounded-lg" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
             <div><label className="block text-sm font-bold text-slate-700 mb-1">Status</label><select className="w-full p-2 border rounded-lg" value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="PLANNED">Planejada</option><option value="ACTIVE">Em Rota</option><option value="COMPLETED">Finalizada</option></select></div>
          </div>
          <div><label className="block text-sm font-bold text-slate-700 mb-1">Motorista</label><select className="w-full p-2 border rounded-lg" value={formData.driverId || ''} onChange={e => setFormData({...formData, driverId: e.target.value})}><option value="">Selecione...</option>{drivers.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-1">Veículo</label><select className="w-full p-2 border rounded-lg" value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: e.target.value})}><option value="">Selecione...</option>{vehicles.map((v:any)=><option key={v.id} value={v.id}>{v.model} - {v.plate}</option>)}</select></div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
           <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
           <button onClick={() => onSave(formData)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"><Save size={18} /> Salvar</button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, routeName }: any) => {
  const [code, setCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  useEffect(() => { if (isOpen) { setCode(Math.floor(100000 + Math.random() * 900000).toString()); setInputCode(''); } }, [isOpen]);
  if (!isOpen) return null;
  const isMatch = inputCode === code;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 bg-red-50 border-b border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><Trash2 size={32} /></div>
          <h3 className="text-xl font-bold text-red-900">Excluir Rota?</h3>
          <p className="text-sm text-red-700 mt-2">Você vai excluir <strong>{routeName}</strong>.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-100 p-4 rounded-xl text-center border border-slate-200"><p className="text-xs text-slate-500 uppercase font-bold mb-1">Código de Segurança</p><div className="text-3xl font-mono font-black text-slate-800 tracking-widest select-all">{code}</div></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Digite o código:</label><input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)} className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-lg font-mono tracking-widest" placeholder="000000" maxLength={6} /></div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-bold">Cancelar</button>
          <button onClick={onConfirm} disabled={!isMatch} className={`flex-1 py-2 text-white rounded-lg font-bold flex items-center justify-center gap-2 ${isMatch ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300'}`}><Trash2 size={18} /> Excluir</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const RoutePlanner: React.FC<any> = ({ routes, setRoutes, deliveries, setDeliveries, drivers, vehicles = [] }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routes[0]?.id || null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [statusFilters, setStatusFilters] = useState<string[]>(['PLANNED', 'ACTIVE', 'COMPLETED']);
  const [stopFilters, setStopFilters] = useState<string[]>(['PENDING', 'DELIVERED', 'FAILED']);

  // Modais
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importResults, setImportResults] = useState<any>({ success: 0, errors: [] });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<Route | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [deliveryActionModalOpen, setDeliveryActionModalOpen] = useState(false);
  const [deliveryToAction, setDeliveryToAction] = useState<{ delivery: Delivery, type: 'DELIVER' | 'FAIL' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const user = JSON.parse(localStorage.getItem('zaproute_user') || '{}');
  const isTetraOilClient = user.tenantName?.toUpperCase().includes('TETRA') || true;

  const toggleStatusFilter = (s: string) => setStatusFilters(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleStopFilter = (s: string) => setStopFilters(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const filteredRoutes = routes.filter((r: any) => statusFilters.includes(r.status));
  const selectedRoute = routes.find((r: any) => r.id === selectedRouteId);
  
  const routeDeliveries = selectedRoute 
    ? deliveries.filter((d: any) => {
        if (!selectedRoute.deliveries.includes(d.id)) return false;
        let group = 'PENDING';
        if (d.status === 'DELIVERED') group = 'DELIVERED';
        else if (d.status === 'FAILED' || d.status === 'RETURNED') group = 'FAILED';
        return stopFilters.includes(group);
    })
    : [];

  useEffect(() => {
    if (filteredRoutes.length > 0 && (!selectedRouteId || !filteredRoutes.find((r: any) => r.id === selectedRouteId))) {
        setSelectedRouteId(filteredRoutes[0].id);
    }
  }, [statusFilters, routes]);

  useEffect(() => {
      if (selectedDeliveryId && itemRefs.current[selectedDeliveryId]) {
          itemRefs.current[selectedDeliveryId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [selectedDeliveryId]);

  const handleSaveEdit = async (data: any) => {
    if (!routeToEdit) return;
    try {
        const updated = await api.routes.update(routeToEdit.id, data);
        setRoutes((prev: any[]) => prev.map(r => r.id === routeToEdit.id ? { ...r, ...data, ...updated } : r));
        setEditModalOpen(false);
    } catch (e) { alert("Erro ao salvar"); }
  };

  const handleDeleteRoute = (r: any) => { setRouteToDelete(r); setDeleteModalOpen(true); };
  const confirmDeleteRoute = async () => {
      if(!routeToDelete) return;
      try {
          await api.routes.delete(routeToDelete.id);
          setRoutes((prev: any[]) => prev.filter(r => r.id !== routeToDelete.id));
          setDeleteModalOpen(false);
          if(selectedRouteId === routeToDelete.id) setSelectedRouteId(null);
      } catch (e) { alert("Erro ao excluir"); }
  };

  const openDeliveryAction = (e: any, d: any, type: any) => {
      e.stopPropagation();
      setDeliveryToAction({ delivery: d, type });
      setDeliveryActionModalOpen(true);
  };

  const handleConfirmDeliveryAction = async () => {
      if (!deliveryToAction) return;
      const { delivery, type } = deliveryToAction;
      const newStatus = type === 'DELIVER' ? DeliveryStatus.DELIVERED : DeliveryStatus.FAILED;
      try {
          await api.routes.updateDeliveryStatus(delivery.id, newStatus, undefined, type === 'FAIL' ? 'Manual' : undefined);
          setDeliveries((prev: any[]) => prev.map(d => d.id === delivery.id ? { ...d, status: newStatus } : d));
          setDeliveryActionModalOpen(false);
          setDeliveryToAction(null);
      } catch (error) { alert("Erro ao atualizar status da entrega."); }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Nome da Rota", "Data (YYYY-MM-DD)", "CPF Motorista", "Placa Veiculo", "Nota Fiscal", "CNPJ Cliente", "Nome Cliente", "Endereco", "Valor", "Volume", "Peso", "Prioridade"], ["Rota Exemplo", "2024-01-01", "", "", "NF-001", "", "Cliente A", "Av Paulista 1000, SP", 100, 1, 10, "NORMAL"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Rotas");
    XLSX.writeFile(wb, "modelo_rotas.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResults({ success: 0, errors: [] });
    const userStr = localStorage.getItem('zaproute_user');
    const user = JSON.parse(userStr || '{}');
    const tenantId = user.tenantId;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);
            if (rows.length === 0) throw new Error("Arquivo vazio.");
            const routesMap: Record<string, any> = {};
            rows.forEach((row: any) => {
                const routeName = row['Nome da Rota'] || 'Rota Importada';
                const driverCpf = String(row['CPF Motorista'] || '');
                const vehiclePlate = String(row['Placa Veiculo'] || '');
                if (!routesMap[routeName]) {
                    routesMap[routeName] = { tenantId, name: routeName, date: row['Data (YYYY-MM-DD)'] || new Date().toISOString(), driverCpf, vehiclePlate, deliveries: [] };
                }
                routesMap[routeName].deliveries.push({ 
                    invoiceNumber: String(row['Nota Fiscal'] || ''), 
                    customerName: row['Nome Cliente'] || 'Desconhecido', 
                    customerCnpj: String(row['CNPJ Cliente'] || ''), 
                    customerAddress: row['Endereco'] || '', 
                    volume: parseFloat(row['Volume'] || 0), 
                    weight: parseFloat(row['Peso'] || 0), 
                    value: parseFloat(row['Valor'] || 0), 
                    priority: row['Prioridade'] || 'NORMAL' 
                });
            });
            let currentSuccess = 0;
            const currentErrors: Array<{ route: string; message: string }> = [];
            for (const key in routesMap) {
                try {
                    await api.routes.import(routesMap[key]);
                    currentSuccess++;
                } catch (error: any) {
                    const msg = error.response?.data?.message || error.message || 'Erro';
                    currentErrors.push({ route: key, message: Array.isArray(msg) ? msg.join(', ') : msg });
                }
            }
            setImportResults({ success: currentSuccess, errors: currentErrors });
            setImportModalOpen(true);
        } catch (error: any) {
            alert(`Falha crítica: ${error.message}`);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  // --- PDF IMPORT (TETRAOIL) ---
  const handlePdfImport = async (e: any) => {
      const f = e.target.files?.[0];
      if(!f) return;
      setIsImporting(true);
      try {
          const buff = await f.arrayBuffer();
          const { routeData, deliveries: dels } = await parseTetraOilPdf(buff);
          await api.routes.import({ 
              tenantId: user.tenantId, 
              name: routeData.name, 
              date: routeData.date, 
              driverCpf: "", 
              vehiclePlate: routeData.vehiclePlate, 
              deliveries: dels.map(d => ({ ...d, customerCnpj: "" })) 
          });
          
          setImportResults({ success: 1, errors: [] });
          setImportModalOpen(true);

      } catch (err:any) { 
          setImportResults({ success: 0, errors: [{ route: 'PDF', message: err.message }] }); 
          setImportModalOpen(true); 
      } finally { 
          setIsImporting(false); 
          if(pdfInputRef.current) pdfInputRef.current.value=''; 
      }
  };

  const getDriverInfo = (id: string) => drivers.find(x=>x.id===id)?.name || 'Sem Motorista';
  const getVehicleInfo = (id: string) => vehicles.find(x=>x.id===id)?.plate || 'Sem Veículo';

  const validPoints = routeDeliveries.filter((d:any) => {
      const l = d.customer?.location;
      return l && !isNaN(Number(l.lat)) && !isNaN(Number(l.lng)) && (Number(l.lat)!==0 || Number(l.lng)!==0);
  });
  const hasCoordinates = validPoints.length > 0;
  const optimizeRoutePoints = (points: any[]) => {
      if (points.length < 2) return points;
      const items = [...points];
      const optimized = [];
      let current = items.shift();
      optimized.push(current);
      while (items.length > 0) {
          let nearestIndex = -1;
          let minDistance = Infinity;
          items.forEach((item, index) => {
              const dist = Math.pow(item.customer.location.lat - current.customer.location.lat, 2) + Math.pow(item.customer.location.lng - current.customer.location.lng, 2);
              if (dist < minDistance) { minDistance = dist; nearestIndex = index; }
          });
          if (nearestIndex !== -1) { current = items[nearestIndex]; optimized.push(current); items.splice(nearestIndex, 1); }
          else { optimized.push(...items); break; }
      }
      return optimized;
  };
  const optimizedPoints = hasCoordinates ? optimizeRoutePoints(validPoints) : [];
  const mapCenterPoints = optimizedPoints.map(d => ({ lat: Number(d.customer.location.lat), lng: Number(d.customer.location.lng) }));

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
        {/* MODAIS */}
        <ImportResultModal isOpen={importModalOpen} onClose={() => window.location.reload()} results={importResults} />
        <EditRouteModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} onSave={handleSaveEdit} route={routeToEdit} drivers={drivers} vehicles={vehicles} />
        <DeleteConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={confirmDeleteRoute} routeName={routeToDelete?.name} />
        {deliveryToAction && <DeliveryActionModal isOpen={deliveryActionModalOpen} onClose={() => setDeliveryActionModalOpen(false)} onConfirm={handleConfirmDeliveryAction} type={deliveryToAction.type} delivery={deliveryToAction.delivery} />}

        <header className="flex justify-between items-center mb-6">
            <div><h1 className="text-3xl font-bold text-slate-800">Gestão de Rotas</h1><p className="text-slate-500">Monitoramento e Rastreamento</p></div>
            <div className="flex gap-3">
                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg"><Download size={18}/> Modelo</button>
                {/* INPUTS OCULTOS COM ACCEPT CORRIGIDO */}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
                <input type="file" ref={pdfInputRef} onChange={handlePdfImport} className="hidden" accept=".pdf" />
                
                <div className="flex rounded-lg shadow-sm overflow-hidden">
                    <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 font-medium border-r border-green-700">{isImporting ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18}/>} Excel</button>
                    {isTetraOilClient && <button onClick={() => pdfInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-medium">{isImporting ? <Loader2 className="animate-spin" size={18}/> : <FileText size={18}/>} PDF</button>}
                </div>
            </div>
        </header>

        <div className="flex flex-1 gap-6 overflow-hidden">
            <div className="w-1/4 flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-700 flex items-center gap-2"><Calendar size={16} /> Rotas</h3><div className="flex items-center gap-1 text-slate-400 text-xs"><Filter size={12} /> Filtrar</div></div>
                    <div className="flex gap-2 flex-wrap">{['PLANNED', 'ACTIVE', 'COMPLETED'].map(s => <button key={s} onClick={() => toggleStatusFilter(s)} className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusFilters.includes(s) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-400'}`}>{s}</button>)}</div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {filteredRoutes.map((r:any) => {
                        const t = r.deliveries.length;
                        const d = deliveries.filter((x:any) => r.deliveries.includes(x.id) && x.status==='DELIVERED').length;
                        const f = deliveries.filter((x:any) => r.deliveries.includes(x.id) && (x.status==='FAILED' || x.status==='RETURNED')).length;
                        const pD = t > 0 ? (d/t)*100 : 0;
                        const pF = t > 0 ? (f/t)*100 : 0;
                        return (
                            <div key={r.id} onClick={() => setSelectedRouteId(r.id)} className={`p-3 rounded border cursor-pointer ${r.id === selectedRouteId ? 'bg-blue-50 border-blue-500' : 'bg-white hover:border-blue-300'}`}>
                                <div className="flex justify-between mb-1"><span className="font-bold text-sm truncate">{r.name}</span><span className="text-[10px] bg-slate-200 px-1 rounded">{r.status}</span></div>
                                <div className="text-xs text-slate-500 space-y-1">
                                    <div className="flex gap-2"><User size={12}/> {getDriverInfo(r.driverId)}</div>
                                    <div className="flex gap-2"><Truck size={12}/> {getVehicleInfo(r.vehicleId)}</div>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-2 mt-2 overflow-hidden flex">
                                    <div className="h-full bg-green-500" style={{width: `${pD}%`}}></div>
                                    <div className="h-full bg-red-500" style={{width: `${pF}%`}}></div>
                                </div>
                                <div className="mt-2 flex justify-between text-xs text-slate-400">
                                    <span>{t} Entregas</span>
                                    <div className="flex gap-2">
                                        <Edit size={14} onClick={(e) => { e.stopPropagation(); setRouteToEdit(r); setEditModalOpen(true); }} className="hover:text-blue-600"/>
                                        <Trash2 size={14} onClick={(e) => { e.stopPropagation(); handleDeleteRoute(r); }} className="hover:text-red-600"/>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden shadow-inner flex flex-col z-0">
                {selectedRoute ? (
                    hasCoordinates ? (
                        <MapContainer center={[-23.5505, -46.6333]} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                            <RecenterMap points={mapCenterPoints} />
                            <Polyline positions={optimizedPoints.map((d:any) => [Number(d.customer.location.lat), Number(d.customer.location.lng)])} color="#3b82f6" weight={4} opacity={0.7} dashArray="5, 10" />
                            {optimizedPoints.map((d:any, idx:number) => (
                                <Marker key={d.id} position={[Number(d.customer.location.lat), Number(d.customer.location.lng)]} icon={d.status==='DELIVERED'?icons.green:(d.status==='FAILED'?icons.red:icons.blue)} eventHandlers={{click:()=>setSelectedDeliveryId(d.id)}}>
                                    <Popup><strong>{idx+1}. {d.customer.tradeName}</strong><br/>{d.customer.location.address}</Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><MapPin size={48} className="opacity-20 mb-2"/><p>Sem coordenadas GPS válidas.</p></div>
                ) : <div className="flex items-center justify-center h-full text-slate-400"><MapIcon size={48} className="opacity-20 mb-2"/><p>Selecione uma rota</p></div>}
            </div>

            <div className="w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-slate-50 space-y-3">
                    <div className="flex justify-between"><h3 className="font-bold text-slate-700">Paradas</h3><span className="text-xs bg-slate-200 px-2 rounded">{routeDeliveries.length}</span></div>
                    <div className="flex gap-1">{['PENDING', 'DELIVERED', 'FAILED'].map(s => <button key={s} onClick={() => toggleStopFilter(s)} className={`flex-1 text-[9px] py-1 border rounded font-bold ${stopFilters.includes(s) ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}>{s.substr(0,4)}</button>)}</div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {routeDeliveries.map((d:any, i:number) => (
                        <div key={d.id} ref={el => itemRefs.current[d.id] = el} onClick={() => setSelectedDeliveryId(d.id)} className={`p-3 border rounded cursor-pointer ${d.id === selectedDeliveryId ? 'bg-blue-50 border-blue-500' : 'hover:bg-slate-50'}`}>
                            <div className="flex gap-3 mb-1">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${d.status==='DELIVERED'?'bg-green-500 text-white':d.status==='FAILED'?'bg-red-500 text-white':'bg-blue-500 text-white'}`}>{i+1}</span>
                                <div className="overflow-hidden"><span className="font-bold text-sm truncate block">{d.customer.tradeName}</span></div>
                            </div>
                            <div className="pl-8 text-xs text-slate-500 space-y-1">
                                <div className="truncate">{d.customer.addressDetails?.street || d.customer.location.address}</div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="bg-slate-100 px-1 rounded border">{d.invoiceNumber}</span>
                                    {(d.status === 'PENDING' || d.status === 'IN_TRANSIT') && selectedRoute?.status === 'ACTIVE' && (
                                        <div className="flex gap-1">
                                            <button onClick={(e) => openDeliveryAction(e, d, 'DELIVER')} className="p-1 bg-green-50 text-green-600 rounded border border-green-200 hover:bg-green-100"><Check size={12}/></button>
                                            <button onClick={(e) => openDeliveryAction(e, d, 'FAIL')} className="p-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100"><X size={12}/></button>
                                        </div>
                                    )}
                                    {d.status === 'DELIVERED' && <span className="text-green-600 font-bold flex gap-1 items-center"><CheckCircle size={10}/> OK</span>}
                                    {(d.status === 'FAILED' || d.status === 'RETURNED') && <span className="text-red-600 font-bold flex gap-1 items-center"><AlertTriangle size={10}/> FALHA</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};