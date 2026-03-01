import React, { useState, useEffect, useRef } from 'react';
import { Driver } from '../types';
import {
  Edit2,
  Plus,
  Upload,
  FileText,
  CheckCircle,
  X,
  AlertCircle,
  ArrowLeft,
  UserCircle,
  Clock,
  Download,
  Loader2,
  FileSpreadsheet,
  Star,
  CreditCard,
  Phone,
  Truck,
  Save,
  Bot,
  MessageSquare,
  Link,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { JourneyHistoryModal } from '../components/JourneyHistoryModal';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import { SkeletonTable } from '../components/ui/SkeletonTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cleanDigits, maskCpfCnpj, maskPhone } from '../utils/masks';
import { isValidCpf, isValidPhone, hasMask } from '../utils/validators';

import { useData } from '../contexts/DataContext';
import { getStoredTenantId } from '../utils/tenant';

export const DriverList: React.FC = () => {
  // --- ESTADO LOCAL (PAGINAÇÃO) ---
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  const { vehicles } = useData(); // Mantemos veículos do contexto para lookup

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedDriverForJourney, setSelectedDriverForJourney] =
    useState<Driver | null>(null);

  // Estado do Modal (Criar/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [formData, setFormData] = useState<Partial<Driver>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Estado de Notificação Global
  const [notification, setNotification] = useState<{
    type: 'SUCCESS' | 'ERROR';
    message: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado de Importação
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Estado do Leônidas (IA)
  const [isLeonidasOpen, setIsLeonidasOpen] = useState(false);
  const [leonidasAnalysis, setLeonidasAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingDriver, setAnalyzingDriver] = useState<Driver | null>(null);

  // Debounce busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carregar Dados Paginados
  const loadDrivers = async () => {
    setIsLoadingList(true);
    try {
      const tenantId = getStoredTenantId();
      if (!tenantId) return;

      const result = await api.drivers.getAllPaginated(
        tenantId,
        page,
        limit,
        debouncedSearch,
      );
      setDrivers(result.data);
      setTotalPages(result.meta.totalPages);
      setTotalRecords(result.meta.total);
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
      setNotification({
        type: 'ERROR',
        message: 'Falha ao carregar lista de motoristas.',
      });
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const getVehicleInfo = (vehicleId: string | null) => {
    if (!vehicleId) return 'Sem Veículo';
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate})` : 'Desconhecido';
  };

  // --- HELPER: VERIFICAR VALIDADE CNH ---
  const isCnhExpired = (dateString: string | Date) => {
    if (!dateString) return false;
    const expiration = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiration.setHours(0, 0, 0, 0);
    return expiration < today;
  };

  const getDaysUntilExpiration = (dateString: string | Date) => {
    if (!dateString) return -1;
    const expiration = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiration.setHours(0, 0, 0, 0);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  // --- HANDLERS ---
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('A imagem é muito grande. Máximo 2MB.');
        return;
      }
      setFormError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          avatarUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      cpf: '',
      cnh: '',
      cnhCategory: 'B',
      cnhExpiration: new Date().toISOString().split('T')[0],
      phone: '',
      email: '',
      rating: 5,
      totalDeliveries: 0,
      avatarUrl: '',
      status: 'IDLE',
      externalId: '', // Default status
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
      cpf: maskCpfCnpj(driver.cpf),
      phone: maskPhone(driver.phone),
      avatarUrl: driver.avatarUrl || '',
      externalId: driver.externalId || '',
    });
    setFormError('');
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');

    try {
      const tenantId = getStoredTenantId();
      if (!tenantId) {
        setFormError('Tenant não encontrado. Faça login novamente.');
        return;
      }

      // Limpa dados antes de enviar
      const payload = {
        ...formData,
        cpf: cleanDigits(formData.cpf || ''),
        phone: cleanDigits(formData.phone || ''),
        cnh: cleanDigits(formData.cnh || ''),
      };

      if (payload.cnhExpiration)
        payload.cnhExpiration = new Date(
          payload.cnhExpiration as string,
        ).toISOString();

      if (!payload.avatarUrl) {
        payload.avatarUrl = `https://ui-avatars.com/api/?name=${payload.name}&background=random`;
      }

      // Garante que se nenhuma categoria for selecionada, salve pelo menos B ou vazio
      if (!payload.cnhCategory) payload.cnhCategory = 'B';

      if (modalMode === 'CREATE') {
        const createPayload = { ...payload, tenantId };
        await api.drivers.create(createPayload);
        setNotification({
          type: 'SUCCESS',
          message: 'Motorista cadastrado com sucesso!',
        });
      } else {
        if (formData.id) {
          await api.drivers.update(formData.id, payload);
          if (selectedDriver && selectedDriver.id === formData.id) {
            setSelectedDriver({ ...selectedDriver, ...payload } as Driver);
          }
          setNotification({
            type: 'SUCCESS',
            message: 'Perfil atualizado com sucesso!',
          });
        }
      }
      setIsModalOpen(false);
      loadDrivers(); // Recarrega lista
    } catch (error) {
      console.error(error);
      setFormError('Erro ao salvar. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (driver: Driver) => {
    setDriverToDelete(driver);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!driverToDelete) return;
    setIsDeleting(true);
    try {
      await api.drivers.delete(driverToDelete.id);
      setNotification({
        type: 'SUCCESS',
        message: 'Motorista excluído com sucesso!',
      });
      setIsDeleteModalOpen(false);
      setDriverToDelete(null);
      loadDrivers();
    } catch (error) {
      console.error(error);
      setNotification({
        type: 'ERROR',
        message: 'Falha ao excluir motorista.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // --- IMPORTAÇÃO ---
  const handleDownloadTemplate = () => {
    const exampleData = [
      {
        Nome: 'João Silva',
        CPF: '123.456.789-00',
        CNH: '12345678900',
        Categoria: 'AB',
        Validade: '2028-01-01',
        Telefone: '(85) 99999-8888',
        Email: 'joao@exemplo.com',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Motoristas');
    XLSX.writeFile(wb, 'modelo_motoristas.xlsx');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const tenantId = getStoredTenantId();
    if (!tenantId) {
      setNotification({
        type: 'ERROR',
        message: 'Tenant não encontrado. Faça login novamente.',
      });
      setIsImporting(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const rows: any[] = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
        );
        if (rows.length === 0) throw new Error('Planilha vazia.');

        const driversToImport: any[] = [];
        const validationErrors: string[] = [];

        rows.forEach((row: any, index: number) => {
          const line = index + 2;
          const rawCpf = String(row['CPF'] || '');
          const rawPhone = String(row['Telefone'] || '');
          const name = row['Nome'];

          // Validações
          if (!name) {
            validationErrors.push(`Linha ${line}: Nome é obrigatório.`);
            return;
          }

          if (hasMask(rawCpf)) {
            validationErrors.push(
              `Linha ${line}: CPF contém pontuação (${rawCpf}). Use apenas números.`,
            );
            return;
          }
          if (hasMask(rawPhone)) {
            validationErrors.push(
              `Linha ${line}: Telefone contém pontuação (${rawPhone}). Use apenas números.`,
            );
            return;
          }

          const cpf = cleanDigits(rawCpf);
          const phone = cleanDigits(rawPhone);

          if (cpf && !isValidCpf(cpf)) {
            validationErrors.push(
              `Linha ${line}: CPF inválido (${row['CPF']}).`,
            );
            return;
          }
          if (phone && !isValidPhone(phone)) {
            validationErrors.push(
              `Linha ${line}: Telefone inválido (${row['Telefone']}).`,
            );
            return;
          }

          driversToImport.push({
            name: name,
            cpf: cpf,
            cnh: cleanDigits(String(row['CNH'] || '')),
            cnhCategory: String(row['Categoria'] || 'B'),
            cnhExpiration: row['Validade'] || new Date().toISOString(),
            phone: phone,
            email: row['Email'],
          });
        });

        if (validationErrors.length > 0) {
          setNotification({
            type: 'ERROR',
            message: `Erros de validação:\n${validationErrors.slice(0, 3).join('\n')}${validationErrors.length > 3 ? '\n...' : ''}`,
          });
          return;
        }
        await api.drivers.import(tenantId, driversToImport);
        setNotification({
          type: 'SUCCESS',
          message: `${driversToImport.length} motoristas importados com sucesso!`,
        });
        loadDrivers(); // Reload
      } catch (error: any) {
        setNotification({
          type: 'ERROR',
          message: 'Erro ao processar arquivo Excel.',
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- VIEW: DETALHE ---
  if (selectedDriver) {
    const expired = isCnhExpired(selectedDriver.cnhExpiration);
    return (
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setSelectedDriver(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Voltar para Lista
          </button>
          <button
            onClick={() => openEditModal(selectedDriver)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm"
          >
            Editar Perfil
          </button>
        </div>
        {/* ... (Detalhes do motorista mantidos iguais) ... */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 relative overflow-hidden">
          <div
            className={`absolute top-0 left-0 w-full h-2 ${selectedDriver.status === 'ON_ROUTE' ? 'bg-blue-500' : selectedDriver.status === 'IDLE' ? 'bg-green-500' : 'bg-slate-400'}`}
          ></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-100">
                <img
                  src={selectedDriver.avatarUrl}
                  alt={selectedDriver.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {selectedDriver.name}
                </h1>
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span>{selectedDriver.rating?.toFixed(1)}</span>
                  <span className="text-slate-300">|</span>
                  <span>{selectedDriver.totalDeliveries} Entregas</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${
                  selectedDriver.status === 'ON_ROUTE'
                    ? 'bg-blue-100 text-blue-700'
                    : selectedDriver.status === 'IDLE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {selectedDriver.status === 'ON_ROUTE'
                  ? 'EM ROTA'
                  : selectedDriver.status === 'IDLE'
                    ? 'DISPONÍVEL'
                    : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <CreditCard size={18} /> Documentação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">
                    CPF
                  </span>
                  {maskCpfCnpj(selectedDriver.cpf)}
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">
                    CNH
                  </span>
                  {selectedDriver.cnh}
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">
                    Categoria
                  </span>
                  {selectedDriver.cnhCategory}
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">
                    Validade
                  </span>
                  <div
                    className={`flex items-center gap-2 font-medium ${expired ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    {new Date(selectedDriver.cnhExpiration).toLocaleDateString(
                      'pt-BR',
                    )}
                    {expired && (
                      <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle size={12} /> VENCIDA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <Phone size={18} /> Contato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">
                    Celular
                  </span>
                  {maskPhone(selectedDriver.phone)}
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">
                    Email
                  </span>
                  {selectedDriver.email}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <Truck size={18} /> Veículo Atual
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                {selectedDriver.vehicleId ? (
                  <>
                    <Truck size={32} className="mx-auto text-blue-500 mb-2" />
                    <p className="font-bold text-slate-800 text-lg">
                      {getVehicleInfo(selectedDriver.vehicleId)}
                    </p>
                    <p className="text-xs text-slate-400 uppercase mt-1">
                      Vinculado para hoje
                    </p>
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
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <UserCircle className="text-blue-600" /> Motoristas
        </h1>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-10 py-2 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isLoadingList && (
              <Loader2
                className="absolute right-3 top-2.5 animate-spin text-slate-400"
                size={16}
              />
            )}
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded border"
          >
            <Download size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".xlsx, .xls"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg font-medium"
          >
            {isImporting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <FileSpreadsheet size={18} />
            )}{' '}
            Importar
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm"
          >
            <Plus size={18} /> Novo
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'SUCCESS'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {notification.type === 'SUCCESS' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <div className="font-bold text-sm">{notification.message}</div>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-current opacity-70 hover:opacity-100"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">CNH / Cat</th>
              <th className="p-4">Veículo</th>
              <th className="p-4">Performance</th>
              <th className="p-4">Validade CNH</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingList ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <SkeletonTable rows={10} columns={7} />
                </td>
              </tr>
            ) : (
              drivers.map((d) => {
                const expired = isCnhExpired(d.cnhExpiration);
                const daysUntil = getDaysUntilExpiration(d.cnhExpiration);
                return (
                  <tr key={d.id} className="hover:bg-slate-50 group">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={d.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                      />
                      <div>
                        <div className="font-bold text-slate-800">{d.name}</div>
                        <div className="text-xs text-slate-400">
                          {maskCpfCnpj(d.cpf)}
                        </div>
                        {d.externalId && (
                          <div className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 rounded inline-block mt-0.5">
                            ID: {d.externalId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {d.cnh}{' '}
                      <span className="text-xs bg-slate-100 px-1 rounded font-bold">
                        {d.cnhCategory}
                      </span>
                    </td>
                    <td className="p-4">
                      {d.vehicleId ? (
                        <span className="text-slate-600">
                          {getVehicleInfo(d.vehicleId)}
                        </span>
                      ) : (
                        <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                          <Link size={14} /> Vincular
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < Math.round(d.rating || 0)
                                  ? 'fill-current'
                                  : 'text-slate-200 fill-slate-200'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                          ({d.totalDeliveries || 0} viagens)
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`flex items-center gap-2 font-medium`}>
                        {expired ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                            <AlertCircle size={12} /> VENCIDA
                          </span>
                        ) : daysUntil < 30 ? (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                            <AlertCircle size={12} /> VENCE EM {daysUntil} DIAS
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            {new Date(d.cnhExpiration).toLocaleDateString(
                              'pt-BR',
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${d.status === 'ON_ROUTE' ? 'bg-blue-100 text-blue-700' : d.status === 'IDLE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {d.status === 'ON_ROUTE'
                          ? 'EM ROTA'
                          : d.status === 'IDLE'
                            ? 'DISPONÍVEL'
                            : 'OFFLINE'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedDriverForJourney(d)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                          title="Ver Jornada"
                        >
                          <Clock size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => setSelectedDriver(d)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Detalhes"
                        >
                          <ArrowLeft size={18} className="rotate-180" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {drivers.length === 0 && !isLoadingList && (
              <tr>
                <td colSpan={7} className="p-0 border-none">
                  <EmptyState
                    icon={UserCircle}
                    title="Nenhum motorista encontrado"
                    description="Tente ajustar os filtros ou cadastrar um novo profissional."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CONTROLES DE PAGINAÇÃO */}
      <div className="flex items-center justify-between mt-8 border-t border-slate-200 pt-6">
        <div className="text-sm text-slate-500">
          Mostrando página{' '}
          <span className="font-bold text-slate-800">{page}</span> de{' '}
          <span className="font-bold text-slate-800">{totalPages}</span> (
          {totalRecords} registros)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5 && page > 3) pNum = page - 2 + i;
              if (pNum > totalPages) return null;

              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                    page === pNum
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>

      {/* MODAL DE JORNADA */}
      {selectedDriverForJourney && (
        <JourneyHistoryModal
          driver={selectedDriverForJourney}
          onClose={() => setSelectedDriverForJourney(null)}
        />
      )}

      {/* MODAL DO LEÔNIDAS */}
      {/* ... Mantido igual ao anterior ... */}

      {/* MODAL DE EDIÇÃO/CRIAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {modalMode === 'CREATE' ? 'Novo Motorista' : 'Editar Motorista'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {formError && (
                <div className="col-span-2 mb-2 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in">
                  <AlertCircle size={18} />
                  {formError}
                </div>
              )}

              {/* FOTO DE PERFIL (UPLOAD) */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Foto de Perfil
                </label>
                <div className="flex gap-4 items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm relative group">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle className="text-slate-300 w-8 h-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                      Recomendado: JPG ou PNG (Max 2MB).
                    </p>
                  </div>
                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, avatarUrl: '' })
                      }
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                      title="Remover foto"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nome Completo
                </label>
                <input
                  required
                  className="w-full p-2 border rounded"
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Matrícula / ID Externo (Opcional)
                </label>
                <input
                  className="w-full p-2 border rounded"
                  value={formData.externalId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, externalId: e.target.value })
                  }
                  placeholder="Ex: 12345"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full p-2 border rounded"
                  value={formData.email || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {/* MULTI-SELECT CATEGORIAS */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Categorias da CNH
                </label>
                <div className="flex gap-2">
                  {availableCategories.map((cat) => {
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
                <p className="text-[10px] text-slate-400 mt-1">
                  Selecionado: {formData.cnhCategory || 'Nenhuma'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  CNH
                </label>
                <input
                  required
                  className="w-full p-2 border rounded"
                  value={formData.cnh || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, cnh: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Validade CNH
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border rounded"
                  value={
                    formData.cnhExpiration ? String(formData.cnhExpiration) : ''
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, cnhExpiration: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  CPF
                </label>
                <input
                  required
                  className="w-full p-2 border rounded"
                  value={formData.cpf || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cpf: maskCpfCnpj(e.target.value),
                    })
                  }
                  maxLength={14}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Telefone
                </label>
                <input
                  required
                  className="w-full p-2 border rounded"
                  value={formData.phone || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: maskPhone(e.target.value),
                    })
                  }
                  maxLength={19}
                />
              </div>

              {/* SELECT DE STATUS */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Status do Motorista
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={formData.status || 'IDLE'}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                >
                  <option value="IDLE">🟢 Disponível (Aguardando)</option>
                  <option value="ON_ROUTE">🔵 Em Rota (Trabalhando)</option>
                  <option value="OFFLINE">
                    ⚫ Indisponível / Férias / Offline
                  </option>
                </select>
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {modalMode === 'CREATE' ? 'Cadastrar' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Excluir Motorista"
        description={`Tem certeza que deseja excluir o motorista ${driverToDelete?.name}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Motorista"
      />
    </div>
  );
};
