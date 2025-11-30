import React, { useState } from 'react';
import {
  LayoutDashboard, Map, Package, AlertTriangle, Users, UserCircle,
  Truck, FileText, Settings, LogOut, X, Waypoints, ChevronLeft, ChevronRight, Briefcase
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

  const menuGroups = [
    {
      title: 'Gestão',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'routes', label: 'Gestão de Rotas', icon: <Map size={20} /> },
      ]
    },
    {
      title: 'Operação',
      items: [
        { id: 'route-list', label: 'Minhas Rotas', icon: <Waypoints size={20} /> },
        { id: 'deliveries', label: 'Entregas', icon: <Package size={20} /> },
        { id: 'occurrences', label: 'Ocorrências', icon: <AlertTriangle size={20} /> },
      ]
    },
    {
      title: 'Cadastros',
      items: [
        { id: 'customers', label: 'Clientes', icon: <Users size={20} /> },
        { id: 'sellers', label: 'Vendedores', icon: <Briefcase size={20} /> },
        { id: 'drivers', label: 'Motoristas', icon: <UserCircle size={20} /> },
        { id: 'vehicles', label: 'Veículos', icon: <Truck size={20} /> },
      ]
    },
    {
      title: 'Sistema',
      items: [
        // { id: 'reports', label: 'Relatórios', icon: <FileText size={20} /> },
        { id: 'settings', label: 'Configurações', icon: <Settings size={20} /> },
      ]
    }
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

          {/* LOGO */}
          <div className="flex items-center justify-center w-full overflow-hidden h-12">
            <img
              src="/logo.png"
              alt="ZapRoute"
              className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'h-12 w-auto'}`}
            />
          </div>

          {/* Botão Fechar Mobile */}
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white absolute right-4">
            <X size={24} />
          </button>

          {/* Botão Recolher Desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-9 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-40 shadow-sm"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* LISTA DE ITENS */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4">
          <nav className="space-y-6">
            {menuGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="px-3">
                {/* Título do Grupo (Apenas Expandido) */}
                {!isCollapsed && (
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 fade-in">
                    {group.title}
                  </h3>
                )}

                {/* Separador (Apenas Colapsado e não no primeiro) */}
                {isCollapsed && groupIndex > 0 && (
                  <div className="border-t border-slate-800 my-3 mx-2" />
                )}

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => {
                          setPage(item.id);
                          setIsOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
                          ${currentPage === item.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                          ${isCollapsed ? 'justify-center' : ''}
                        `}
                      >
                        <div className="shrink-0">{item.icon}</div>

                        {!isCollapsed && (
                          <span className="font-medium text-sm whitespace-nowrap overflow-hidden">
                            {item.label}
                          </span>
                        )}
                      </button>

                      {/* Tooltip (Apenas Colapsado + Hover) */}
                      {isCollapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                          {item.label}
                          {/* Seta do Tooltip */}
                          <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-4 px-2 transition-all`}>
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 font-bold text-slate-300 cursor-default border border-slate-600" title={userName}>
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

          <div className="relative group">
            <button
              onClick={logout}
              className={`w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut size={20} />
              {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
            </button>

            {/* Tooltip Sair */}
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                Sair
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="text-center pt-3 border-t border-slate-800/50 mt-3">
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