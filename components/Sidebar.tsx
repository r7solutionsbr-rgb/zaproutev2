import React from 'react';
import { LayoutDashboard, Map, Package, AlertTriangle, Users, UserCircle, Truck, FileText, Settings, LogOut, X, Waypoints } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userRole: string;
  userName: string;       
  tenantName: string;     
  logout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, setPage, isOpen, setIsOpen, 
  userRole, userName, tenantName, logout 
}) => {
  
  // --- CONTROLE DE VERSÃO ---
  const appVersion = '1.0.0';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'routes', label: 'Gestão de Rotas', icon: <Map size={20} /> },
    { id: 'route-list', label: 'Rotas', icon: <Waypoints size={20} /> },
    { id: 'deliveries', label: 'Entregas', icon: <Package size={20} /> },
    { id: 'occurrences', label: 'Ocorrências', icon: <AlertTriangle size={20} /> },
    { id: 'customers', label: 'Clientes', icon: <Users size={20} /> },
    { id: 'drivers', label: 'Motoristas', icon: <UserCircle size={20} /> },
    { id: 'vehicles', label: 'Veículos', icon: <Truck size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <FileText size={20} /> },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-30 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:block flex flex-col
      `}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">Z</div>
            <span className="text-xl font-bold tracking-tight">ZapRoute</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider">Menu</div>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${currentPage === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 font-bold text-slate-300">
              {/* Inicial do nome ou icone */}
              {userName ? userName.charAt(0).toUpperCase() : <UserCircle />}
            </div>
            <div className="flex-1 min-w-0">
              {/* Nome do Usuário com Truncate */}
              <p className="text-sm font-bold text-white truncate" title={userName}>
                {userName || 'Usuário'}
              </p>
              {/* Nome da Empresa com Truncate */}
              <p className="text-xs text-slate-500 truncate" title={tenantName}>
                {tenantName || 'Empresa'}
              </p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>

          {/* --- VERSÃO DO SISTEMA --- */}
          <div className="text-center pt-2 border-t border-slate-800/50 mt-2">
            <p className="text-[10px] text-slate-600 font-mono">
              ZapRoute v{appVersion}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};