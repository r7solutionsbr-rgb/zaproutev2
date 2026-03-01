import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  User,
  Calendar,
  Search,
  Camera,
  CameraOff,
  Maximize2,
  Eye,
  CheckCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { SkeletonTable } from '../components/ui/SkeletonTable';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../services/api';
import { useData } from '../contexts/DataContext';
import { Delivery, Route } from '../types';
import { getStoredTenantId } from '../utils/tenant';

export const OccurrenceList: React.FC = () => {
  // --- PAGINAÇÃO SERVER-SIDE ---
  const [occurrences, setOccurrences] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filter e Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  const { drivers } = useData();
  const [routes, setRoutes] = useState<Route[]>([]); // Ainda preciso de rotas para lookup de nomes? O endpoint retorna delivery.route

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAILED' | 'RETURNED'>(
    'ALL',
  );

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carrega DADOS
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const tenantId = getStoredTenantId();
        if (!tenantId) return;

        // Filtros
        let statusFilter: string | undefined = undefined;
        if (activeTab === 'FAILED') statusFilter = 'FAILED';
        if (activeTab === 'RETURNED') statusFilter = 'RETURNED';

        const filters = {
          status: statusFilter,
          search: debouncedSearch,
        };

        const result = await api.occurrences.getAllPaginated(
          tenantId,
          page,
          limit,
          filters,
        );

        // Processa dados
        const processedOccurrences = result.data.map((d: any) => ({
          ...d,
          customer: {
            ...d.customer,
            location: d.customer.location || {
              lat: 0,
              lng: 0,
              address: d.customer.addressDetails?.street || '',
            },
            addressDetails: d.customer.addressDetails || {
              street: '',
              number: '',
              neighborhood: '',
              city: '',
              state: '',
              zipCode: '',
            },
          },
          // Garante que route esteja presente se o include funcionou
          route: d.route || { name: 'Rota Desconhecida', id: d.routeId },
        }));

        setOccurrences(processedOccurrences);
        setTotalPages(result.meta.totalPages);
        setTotalRecords(result.meta.total);
      } catch (error) {
        console.error('Erro ao carregar ocorrências:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [page, activeTab, debouncedSearch]);

  // Reset page
  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Não atribuído';
    // Tenta pegar do driver incluído na delivery (se vier do backend) ou do contexto global
    // No backend incluímos 'driver: true', então d.driver deve existir.
    // Mas aqui estamos iterando sobre 'occurrences' que são do tipo Delivery.
    // Vamos checar se o tipo Delivery no frontend tem o campo driver? Provavelmente não opcional.
    // Melhor usar o contexto global como fallback ou usar o nome se vier no objeto.
    const contextDriver = drivers.find((d) => d.id === driverId);
    return contextDriver?.name || 'Desconhecido';
  };

  const getRouteName = (routeId?: string, routeObj?: any) => {
    if (routeObj && routeObj.name) return routeObj.name;
    // Se não veio populado, paciência (ou buscaria do contexto se tivesse todas as rotas, mas não temos mais)
    return routeId || 'Sem rota';
  };

  // --- VIEW: DETAIL ---
  if (selectedId) {
    const delivery = occurrences.find((d) => d.id === selectedId);
    if (!delivery) return <div>Ocorrência não encontrada</div>;

    // Type casting para acessar propriedades populadas que podem não estar na interface base Delivery
    const deliveryWithRelations = delivery as any;

    return (
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Voltar para Ocorrências
        </button>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 flex items-start gap-4">
          <div className="bg-red-100 p-3 rounded-full text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-800">
              {delivery.status === 'FAILED'
                ? 'Entrega Falhou'
                : 'Mercadoria Devolvida'}
            </h2>
            <p className="text-red-700 mt-1">
              Motivo registrado:{' '}
              <span className="font-bold">
                {delivery.failureReason || 'Não especificado'}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">
              Dados da Entrega
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-slate-400 text-xs uppercase">
                  Cliente
                </span>
                <span className="font-medium text-slate-800 text-lg">
                  {delivery.customer.tradeName}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">
                  Endereço
                </span>
                <span className="text-slate-600">
                  {delivery.customer.location?.address}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">
                  Nota Fiscal
                </span>
                <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                  {delivery.invoiceNumber}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">
              Dados Logísticos
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-slate-400 text-xs uppercase">
                  Motorista Responsável
                </span>
                <span className="font-medium text-slate-800 flex items-center gap-2">
                  <User size={14} />{' '}
                  {deliveryWithRelations.driver?.name ||
                    getDriverName(delivery.driverId)}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">
                  Rota
                </span>
                <span className="text-slate-600">
                  {getRouteName(delivery.routeId, deliveryWithRelations.route)}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">
                  Data do Ocorrido
                </span>
                <span className="text-slate-600 flex items-center gap-2">
                  <Calendar size={14} />{' '}
                  {new Date(delivery.updatedAt!).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* EVIDÊNCIA FOTOGRÁFICA */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Camera size={18} className="text-slate-400" /> Evidência
              Registrada
            </h3>
            {delivery.proofOfDelivery && (
              <a
                href={delivery.proofOfDelivery}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Maximize2 size={14} /> Ampliar
              </a>
            )}
          </div>

          <div className="p-6 flex justify-center bg-slate-50/50">
            {delivery.proofOfDelivery ? (
              <div className="relative group max-w-2xl w-full">
                <img
                  src={delivery.proofOfDelivery}
                  alt="Prova de Entrega"
                  className="w-full h-auto max-h-96 object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg pointer-events-none" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-slate-400 w-full max-w-2xl bg-slate-50">
                <CameraOff size={48} className="mb-4 opacity-50" />
                <p className="font-medium text-slate-500">
                  Nenhuma foto anexada
                </p>
                <p className="text-sm">
                  O motorista não registrou evidência visual para esta
                  ocorrência.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <AlertTriangle className="text-red-600" /> Ocorrências
          </h1>
          <p className="text-slate-500 mt-1">
            Monitoramento de falhas e devoluções.
          </p>
        </div>
        {/* Loader removido daqui, agora é Skeleton na tabela */}
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
        {[
          { id: 'ALL', label: 'Todas' },
          { id: 'FAILED', label: 'Falhas' },
          { id: 'RETURNED', label: 'Devoluções' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH */}
      <div className="mb-6 relative w-full md:w-96">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Buscar por NF ou Cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Nota Fiscal</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Motorista / Rota</th>
              <th className="p-4">Motivo da Ocorrência</th>
              <th className="p-4 text-center">Tipo</th>
              <th className="p-4 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <SkeletonTable rows={10} columns={6} />
                </td>
              </tr>
            ) : (
              occurrences.map((occ) => {
                const deliveryWithRelations = occ as any;
                return (
                  <tr
                    key={occ.id}
                    className="hover:bg-slate-50 group transition-colors"
                  >
                    <td className="p-4 font-mono text-slate-700 font-medium">
                      {occ.invoiceNumber}
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {occ.customer.tradeName}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 font-medium">
                        {deliveryWithRelations.driver?.name ||
                          getDriverName(occ.driverId)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {getRouteName(occ.routeId, deliveryWithRelations.route)}
                      </div>
                    </td>
                    <td className="p-4 text-red-600 font-medium">
                      {occ.failureReason || 'Motivo não informado'}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                          occ.status === 'RETURNED'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {occ.status === 'RETURNED' ? 'DEVOLUÇÃO' : 'FALHA'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedId(occ.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {occurrences.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="p-0 border-none">
                  <EmptyState
                    icon={CheckCircle}
                    title="Nenhuma ocorrência encontrada"
                    description="Ótimo trabalho! Tudo parece estar em ordem ou os filtros não retornaram resultados."
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
    </div>
  );
};
