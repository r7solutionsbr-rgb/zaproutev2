
import React, { useState } from 'react';
import { Delivery, Route, Driver, DeliveryStatus } from '../types';
import { AlertTriangle, ArrowLeft, User, MapPin, FileText, Calendar, CheckCircle } from 'lucide-react';

import { useData } from '../contexts/DataContext';

export const OccurrenceList: React.FC = () => {
  const { deliveries, routes, drivers } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter only problematic deliveries
  const occurrences = deliveries.filter(d =>
    d.status === DeliveryStatus.FAILED || d.status === DeliveryStatus.RETURNED
  );

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Não atribuído';
    return drivers.find(d => d.id === driverId)?.name || 'Desconhecido';
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return 'Sem rota';
    return routes.find(r => r.id === routeId)?.name || routeId;
  };

  // --- VIEW: DETAIL ---
  if (selectedId) {
    const delivery = occurrences.find(d => d.id === selectedId);
    if (!delivery) return <div>Ocorrência não encontrada</div>;

    return (
      <div className="p-6 max-w-7xl mx-auto">
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
              {delivery.status === 'FAILED' ? 'Entrega Falhou' : 'Mercadoria Devolvida'}
            </h2>
            <p className="text-red-700 mt-1">Motivo registrado: <span className="font-bold">{delivery.failureReason || 'Não especificado'}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Dados da Entrega</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-slate-400 text-xs uppercase">Cliente</span>
                <span className="font-medium text-slate-800 text-lg">{delivery.customer.tradeName}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">Endereço</span>
                <span className="text-slate-600">{delivery.customer.location.address}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">Nota Fiscal</span>
                <span className="font-mono bg-slate-100 px-2 py-1 rounded">{delivery.invoiceNumber}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Dados Logísticos</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-slate-400 text-xs uppercase">Motorista Responsável</span>
                <span className="font-medium text-slate-800 flex items-center gap-2">
                  <User size={14} /> {getDriverName(delivery.driverId)}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">Rota</span>
                <span className="text-slate-600">{getRouteName(delivery.routeId)}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs uppercase">Data do Ocorrido</span>
                <span className="text-slate-600 flex items-center gap-2">
                  <Calendar size={14} /> Hoje
                </span>
              </div>
            </div>
          </div>
        </div>

        {delivery.proofOfDelivery && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4">Evidência Fotográfica</h3>
            <img src={delivery.proofOfDelivery} alt="Evidência" className="rounded-lg max-h-96 object-contain border border-slate-100" />
          </div>
        )}
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
          <p className="text-slate-500 mt-1">Monitoramento de falhas e devoluções.</p>
        </div>
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
              <th className="p-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {occurrences.map(occ => (
              <tr key={occ.id} className="hover:bg-slate-50 group">
                <td className="p-4 font-mono text-slate-700">{occ.invoiceNumber}</td>
                <td className="p-4 font-medium text-slate-800">{occ.customer.tradeName}</td>
                <td className="p-4">
                  <div className="text-slate-800 font-medium">{getDriverName(occ.driverId)}</div>
                  <div className="text-xs text-slate-400">{getRouteName(occ.routeId)}</div>
                </td>
                <td className="p-4 text-red-600 font-medium">
                  {occ.failureReason || 'Motivo não informado'}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${occ.status === 'RETURNED' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {occ.status === 'RETURNED' ? 'DEVOLUÇÃO' : 'FALHA'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedId(occ.id)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Ver Detalhes
                  </button>
                </td>
              </tr>
            ))}

            {occurrences.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
                  <p>Nenhuma ocorrência registrada hoje. Ótimo trabalho!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
