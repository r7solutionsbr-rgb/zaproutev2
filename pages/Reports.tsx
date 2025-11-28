
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Download, FileText, TrendingUp, DollarSign, Users, Filter, Calendar } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OPERATIONAL' | 'FINANCIAL' | 'DRIVERS'>('OPERATIONAL');

  // --- MOCK DATA ---
  const operationalData = [
    { name: 'Seg', entregas: 420, falhas: 20 },
    { name: 'Ter', entregas: 380, falhas: 15 },
    { name: 'Qua', entregas: 550, falhas: 42 },
    { name: 'Qui', entregas: 490, falhas: 25 },
    { name: 'Sex', entregas: 600, falhas: 30 },
    { name: 'Sáb', entregas: 200, falhas: 5 },
  ];

  const financialData = [
    { name: 'Semana 1', faturado: 150000, devolvido: 5000 },
    { name: 'Semana 2', faturado: 180000, devolvido: 8000 },
    { name: 'Semana 3', faturado: 160000, devolvido: 4000 },
    { name: 'Semana 4', faturado: 210000, devolvido: 12000 },
  ];

  const driverPerformance = [
    { name: 'Carlos Silva', score: 98, entregas: 1250 },
    { name: 'Mariana Souza', score: 95, entregas: 890 },
    { name: 'Roberto Alves', score: 88, entregas: 2100 },
    { name: 'Julia Lima', score: 100, entregas: 450 },
  ];

  const reasonData = [
    { name: 'Cliente Ausente', value: 45 },
    { name: 'Endereço Não Localizado', value: 25 },
    { name: 'Recusa de Mercadoria', value: 15 },
    { name: 'Veículo Quebrado', value: 10 },
    { name: 'Outros', value: 5 },
  ];

  // --- EXPORT HANDLERS ---
  const handleExport = (format: 'PDF' | 'CSV') => {
    alert(`Gerando relatório em ${format}... (Simulação: Download iniciado)`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="text-blue-600" /> Relatórios e Analytics
          </h1>
          <p className="text-slate-500 mt-1">Análise detalhada da operação logística.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleExport('CSV')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm"
          >
            <Download size={18} /> Excel (CSV)
          </button>
          <button 
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium"
          >
            <FileText size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit">
        <button 
          onClick={() => setActiveTab('OPERATIONAL')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'OPERATIONAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp size={16} /> Operacional
        </button>
        <button 
          onClick={() => setActiveTab('FINANCIAL')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'FINANCIAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <DollarSign size={16} /> Financeiro
        </button>
        <button 
          onClick={() => setActiveTab('DRIVERS')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'DRIVERS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} /> Motoristas
        </button>
      </div>

      {/* --- OPERATIONAL REPORT --- */}
      {activeTab === 'OPERATIONAL' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="text-slate-500 text-xs font-bold uppercase mb-2">Volume Total (Semana)</div>
               <div className="text-3xl font-bold text-slate-800">2.640</div>
               <div className="text-green-600 text-xs font-medium mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> +15% vs semana anterior
               </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="text-slate-500 text-xs font-bold uppercase mb-2">Taxa de Sucesso</div>
               <div className="text-3xl font-bold text-blue-600">94.8%</div>
               <div className="text-slate-400 text-xs mt-1">Meta: 95%</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="text-slate-500 text-xs font-bold uppercase mb-2">Tempo Médio / Entrega</div>
               <div className="text-3xl font-bold text-slate-800">18 min</div>
               <div className="text-orange-500 text-xs font-medium mt-1">-2 min (melhoria)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-6">Entregas vs Falhas (Últimos 7 dias)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operationalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip cursor={{fill: '#f8fafc'}} />
                      <Legend />
                      <Bar dataKey="entregas" name="Entregas Realizadas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar dataKey="falhas" name="Ocorrências/Falhas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-6">Principais Motivos de Falha</h3>
                <div className="h-80 flex items-center justify-center">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reasonData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reasonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- FINANCIAL REPORT --- */}
      {activeTab === 'FINANCIAL' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center justify-between">
                 <span>Faturamento Transportado (Mensal)</span>
                 <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar size={16} /> Últimos 30 dias
                 </div>
              </h3>
              <div className="h-96">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFaturado" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDevolvido" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(val) => `R$ ${val/1000}k`} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="faturado" name="Valor Entregue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFaturado)" />
                      <Area type="monotone" dataKey="devolvido" name="Valor Devolvido" stroke="#ef4444" fillOpacity={1} fill="url(#colorDevolvido)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {/* --- DRIVERS REPORT --- */}
      {activeTab === 'DRIVERS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-700 mb-6">Ranking de Performance</h3>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                     <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                           <th className="p-4">Ranking</th>
                           <th className="p-4">Motorista</th>
                           <th className="p-4 text-right">Volume Entregas</th>
                           <th className="p-4 text-center">Score de Qualidade (0-100)</th>
                           <th className="p-4">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {driverPerformance.sort((a,b) => b.score - a.score).map((driver, idx) => (
                           <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-4">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                    idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                                    idx === 2 ? 'bg-orange-100 text-orange-800' : 'text-slate-500'
                                 }`}>
                                    {idx + 1}º
                                 </div>
                              </td>
                              <td className="p-4 font-medium text-slate-800">{driver.name}</td>
                              <td className="p-4 text-right">{driver.entregas}</td>
                              <td className="p-4 text-center">
                                 <div className="flex items-center justify-center gap-2">
                                    <div className="w-24 bg-slate-200 rounded-full h-2">
                                       <div 
                                          className={`h-2 rounded-full ${driver.score >= 90 ? 'bg-green-500' : driver.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'}`} 
                                          style={{ width: `${driver.score}%` }}
                                       ></div>
                                    </div>
                                    <span className="font-bold">{driver.score}</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 {driver.score >= 90 ? (
                                    <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">EXCELENTE</span>
                                 ) : driver.score >= 80 ? (
                                    <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded">BOM</span>
                                 ) : (
                                    <span className="text-yellow-600 text-xs font-bold bg-yellow-100 px-2 py-1 rounded">REGULAR</span>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};
