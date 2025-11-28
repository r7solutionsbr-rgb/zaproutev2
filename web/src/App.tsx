import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { RoutePlanner } from './pages/RoutePlanner';
import { RouteList } from './pages/RouteList';
import { DeliveryList } from './pages/DeliveryList';
import { OccurrenceList } from './pages/OccurrenceList';
import { CustomerList } from './pages/CustomerList';
import { DriverList } from './pages/DriverList';
import { VehicleList } from './pages/VehicleList';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { DriverApp } from './pages/DriverApp';
import { CepSearch } from './pages/CepSearch';
import { Delivery, Route, Driver, DeliveryStatus, Vehicle } from './types';
import { LogIn, AlertCircle, Loader2, Menu } from 'lucide-react';
import { api } from './services/api';

const App = () => {
  // --- GLOBAL STATE (CORRIGIDO: Única declaração com tenantName) ---
  const [user, setUser] = useState<{ id: string, name: string, role: string, tenantId: string, tenantName?: string } | null>(null);
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@zaproute.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data State
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Check for cached user
  useEffect(() => {
    const cached = localStorage.getItem('zaproute_user');
    if (cached) {
      setUser(JSON.parse(cached));
    }
  }, []);

  // Fetch Data when User Logs In
  useEffect(() => {
    if (user && user.role !== 'DRIVER') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const routesData = await api.routes.getAll(user.tenantId);
      
      // 1. Extrair todas as entregas
      const allDeliveries: Delivery[] = [];
      routesData.forEach((r: any) => {
          if (r.deliveries) {
             r.deliveries.forEach((d: any) => {
                if(d.customer) {
                    allDeliveries.push({
                        ...d,
                        customer: {
                            ...d.customer,
                            location: d.customer.location || { lat: 0, lng: 0, address: d.customer.addressDetails?.street || '' },
                            addressDetails: d.customer.addressDetails || { 
                                street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' 
                            }
                        }
                    });
                }
             });
          }
      });
      setDeliveries(allDeliveries);

      // 2. Normalizar Rotas
      const normalizedRoutes = routesData.map((r: any) => ({
        ...r,
        deliveries: r.deliveries ? r.deliveries.map((d: any) => d.id) : []
      }));
      setRoutes(normalizedRoutes);

      const driversData = await api.drivers.getAll(user.tenantId);
      setDrivers(driversData);
      
      const vehiclesData = await api.vehicles.getAll(user.tenantId);
      setVehicles(vehiclesData);

    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    
    try {
      const data = await api.auth.login(loginEmail, loginPassword);
      
      localStorage.setItem('zaproute_token', data.access_token);
      localStorage.setItem('zaproute_user', JSON.stringify(data.user));
      setUser(data.user);
      
    } catch (err) {
      setLoginError('E-mail ou senha incorretos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRoutes([]);
    setDeliveries([]);
    localStorage.removeItem('zaproute_user');
    localStorage.removeItem('zaproute_token');
  };

  const handleDeliveryUpdate = (id: string, status: DeliveryStatus, proof?: string) => {
    setDeliveries(prev => prev.map(d => 
      d.id === id ? { ...d, status, proofOfDelivery: proof } : d
    ));
    api.routes.updateDeliveryStatus(id, status, proof);
  };

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-6">
               <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">Z</div>
            </div>
            <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">ZapRoute Login</h1>
            <p className="text-center text-slate-500 mb-8">Acesso Seguro</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input 
                    type="email" 
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="nome@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input 
                    type="password" 
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="******"
                />
              </div>

              {loginError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                      <AlertCircle size={16} /> {loginError}
                  </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />} 
                {isLoading ? 'Entrando...' : 'Acessar Sistema'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Driver View
  if (user.role === 'DRIVER') {
    return (
      <DriverApp 
        driverId={user.id} 
        deliveries={deliveries} 
        updateDeliveryStatus={handleDeliveryUpdate} 
      />
    );
  }

  // Admin View
  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar 
          currentPage={currentPage} 
          setPage={setCurrentPage} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen}
          userRole={user.role}
          userName={user.name}
          tenantName={user.tenantName || 'Minha Empresa'}
          logout={handleLogout}
        />
        
        <main className="flex-1 min-w-0 overflow-hidden relative">
           <div className="md:hidden p-4 bg-white border-b flex items-center justify-between">
              <div className="font-bold text-lg">ZapRoute</div>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
                <Menu />
              </button>
           </div>

           <div className="overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
             {isLoading && (
                 <div className="absolute top-4 right-4 z-50 bg-white px-4 py-2 rounded-full shadow flex items-center gap-2 text-sm font-bold text-blue-600 pointer-events-none">
                     <Loader2 className="animate-spin" size={16} /> Carregando...
                 </div>
             )}

             {currentPage === 'dashboard' && <Dashboard deliveries={deliveries} routes={routes} />}
             {currentPage === 'cep-search' && <CepSearch />}
             {currentPage === 'routes' && (
                <RoutePlanner 
                    routes={routes} 
                    setRoutes={setRoutes} 
                    deliveries={deliveries} 
                    setDeliveries={setDeliveries} 
                    drivers={drivers} 
                    vehicles={vehicles}
                />
             )}
             {currentPage === 'route-list' && (
                <RouteList 
                  routes={routes} 
                  deliveries={deliveries} 
                  drivers={drivers} 
                  vehicles={vehicles}
                />
             )}
             {currentPage === 'deliveries' && (
                <DeliveryList deliveries={deliveries} drivers={drivers} />
             )}
             {currentPage === 'occurrences' && (
                <OccurrenceList deliveries={deliveries} routes={routes} drivers={drivers} />
             )}
             {currentPage === 'customers' && (
                <CustomerList deliveries={deliveries} />
             )}
             {currentPage === 'drivers' && (
                <DriverList drivers={drivers} vehicles={vehicles} />
             )}
             {currentPage === 'vehicles' && (
                <VehicleList vehicles={vehicles} drivers={drivers} />
             )}
             {currentPage === 'reports' && <Reports />}
             {currentPage === 'settings' && <Settings />}
           </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;