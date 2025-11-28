import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Delivery, Route as RouteType, Driver, Vehicle } from './types';
import { LogIn, AlertCircle, Loader2, Link } from 'lucide-react';
import { api } from './services/api';

// --- COMPONENTE DE LOGIN (Extraído) ---
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState(''); // Valor padrão ajustado para o seed
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      localStorage.setItem('zaproute_token', data.access_token);
      localStorage.setItem('zaproute_user', JSON.stringify(data.user));
      onLogin(); // Atualiza estado do pai
      navigate('/'); // Redireciona para home
    } catch (err) {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8">
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
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Esqueceu a senha?</Link>
          </div>

          {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
              </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />} 
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTE LAYOUT PROTEGIDO ---
const ProtectedLayout = ({ user, logout }: any) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Estados de Dados
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega dados iniciais
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Rotas e Entregas
            const routesData = await api.routes.getAll(user.tenantId);
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
                                    addressDetails: d.customer.addressDetails || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' }
                                }
                            });
                        }
                    });
                }
            });
            setDeliveries(allDeliveries);
            setRoutes(routesData.map((r: any) => ({ ...r, deliveries: r.deliveries ? r.deliveries.map((d: any) => d.id) : [] })));

            // 2. Cadastros Básicos
            const [driversData, vehiclesData] = await Promise.all([
                api.drivers.getAll(user.tenantId),
                api.vehicles.getAll(user.tenantId)
            ]);
            setDrivers(driversData);
            setVehicles(vehiclesData);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  // Se for Motorista, mostra App Simplificado
  if (user.role === 'DRIVER') {
      return <DriverApp driverId={user.id} deliveries={deliveries} updateDeliveryStatus={() => {}} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        currentPage={currentPage} setPage={setCurrentPage} 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
        userRole={user.role} userName={user.name} tenantName={user.tenantName} logout={logout}
      />
      
      <main className="flex-1 min-w-0 overflow-hidden relative p-4 overflow-y-auto h-screen">
         {/* Loader Global */}
         {loading && (
             <div className="absolute top-4 right-4 z-50 bg-white px-4 py-2 rounded-full shadow flex items-center gap-2 text-sm font-bold text-blue-600 pointer-events-none">
                 <Loader2 className="animate-spin" size={16} /> Carregando...
             </div>
         )}

         {/* Roteamento Interno do Dashboard */}
         {currentPage === 'dashboard' && <Dashboard deliveries={deliveries} routes={routes} />}
         {currentPage === 'routes' && <RoutePlanner routes={routes} setRoutes={setRoutes} deliveries={deliveries} setDeliveries={setDeliveries} drivers={drivers} vehicles={vehicles}/>}
         {currentPage === 'route-list' && <RouteList routes={routes} deliveries={deliveries} drivers={drivers} vehicles={vehicles}/>}
         {currentPage === 'deliveries' && <DeliveryList deliveries={deliveries} drivers={drivers} />}
         {currentPage === 'occurrences' && <OccurrenceList deliveries={deliveries} routes={routes} drivers={drivers} />}
         {currentPage === 'customers' && <CustomerList deliveries={deliveries} />}
         {currentPage === 'drivers' && <DriverList drivers={drivers} vehicles={vehicles} />}
         {currentPage === 'vehicles' && <VehicleList vehicles={vehicles} drivers={drivers} />}
         {currentPage === 'reports' && <Reports />}
         {currentPage === 'settings' && <Settings />}
         {currentPage === 'cep-search' && <CepSearch />}
      </main>
    </div>
  );
};

// --- APP ROOT ---
const App = () => {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('zaproute_user');
    if (cached) setUser(JSON.parse(cached));
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  const refreshUser = () => {
      const cached = localStorage.getItem('zaproute_user');
      if (cached) setUser(JSON.parse(cached));
  };

  if (!authChecked) return null; // Evita piscar a tela de login se já estiver logado

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen onLogin={refreshUser} /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Rota Protegida (Dashboard) */}
        <Route path="/*" element={<ProtectedLayout user={user} logout={handleLogout} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;