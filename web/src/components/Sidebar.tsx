import React, { useState } from 'react';
import { 
  LayoutDashboard, Map, Package, AlertTriangle, Users, UserCircle, 
  Truck, FileText, Settings, LogOut, X, Waypoints, ChevronLeft, ChevronRight 
} from 'lucide-react';

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
  
  const [isCollapsed, setIsCollapsed] = useState(false);
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
        fixed top-0 left-0 z-30 h-screen bg-slate-900 text-white transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:block flex flex-col
        ${isCollapsed ? 'md:w-20' : 'md:w-64'} 
      `}>
        {/* HEADER DO MENU */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-6 border-b border-slate-800 shrink-0 relative transition-all`}>
          
          {/* LOGO (Apenas Imagem, centralizada) */}
          <div className="flex items-center justify-center w-full overflow-hidden">
            <img 
              src="/logo.png" 
              alt="ZapRoute" 
              className="h-12 w-auto object-contain shrink-0 transition-all duration-300" 
            />
          </div>
          
          {/* Botão Fechar Mobile (Posicionado Absolutamente para não quebrar o layout) */}
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white absolute right-4">
            <X size={24} />
          </button>

          {/* Botão Recolher Desktop */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-40"
          >
            {isCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>

        {/* LISTA DE ITENS */}
        <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
          {!isCollapsed && <div className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider fade-in">Menu</div>}
          
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setIsOpen(false);
                }}
                title={isCollapsed ? item.label : ''} 
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${currentPage === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  ${isCollapsed ? 'justify-center px-2' : ''}
                `}
              >
                <div className="shrink-0">{item.icon}</div>
                {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-4 px-2 transition-all`}>
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 font-bold text-slate-300 cursor-default" title={userName}>
              {userName ? userName.charAt(0).toUpperCase() : <UserCircle />}
            </div>
            
            {!isCollapsed && (
                <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">
                    {userName || 'Usuário'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                    {tenantName || 'Empresa'}
                </p>
                </div>
            )}
          </div>
          
          <button 
            onClick={logout}
            title={isCollapsed ? "Sair" : ""}
            className={`w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Sair</span>}
          </button>

          {!isCollapsed && (
              <div className="text-center pt-2 border-t border-slate-800/50 mt-2">
                <p className="text-[10px] text-slate-600 font-mono">
                v{appVersion}
                </p>
              </div>
          )}
        </div>
      </aside>
    </>
  );
};