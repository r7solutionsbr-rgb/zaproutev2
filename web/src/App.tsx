import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { RoutePlanner } from './pages/RoutePlanner';
import { RouteList } from './pages/RouteList';
import { DeliveryList } from './pages/DeliveryList';
import { OccurrenceList } from './pages/OccurrenceList';
import { CustomerList } from './pages/CustomerList';
import { DriverList } from './pages/DriverList';
import { VehicleList } from './pages/VehicleList';
import { SellerList } from './pages/SellerList';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { DriverApp } from './pages/DriverApp';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CepSearch } from './pages/CepSearch';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { api } from './services/api';
import { DataProvider, useData } from './contexts/DataContext';
import { AiChatWidget } from './components/AiChatWidget';

// --- COMPONENTE DE LOGIN ---
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
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
      onLogin();
      if (data.user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
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
          <img src="/logo.png" alt="ZapRoute" className="w-64 h-auto object-contain" />
        </div>
        <p className="text-center text-slate-500 mb-8 font-medium">Acesso Seguro</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Esqueceu a senha?</Link>
          </div>
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTE LAYOUT PROTEGIDO ---
const ProtectedLayoutContent = ({ user, logout }: any) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { loading, deliveries } = useData(); // Usa o contexto para loading global e dados para DriverApp

  if (!user) return <Navigate to="/login" />;

  // Se for Motorista, mostra App Simplificado
  if (user.role === 'DRIVER') {
    return <DriverApp driverId={user.id} deliveries={deliveries} updateDeliveryStatus={() => { }} />;
  }

  // Se for Super Admin, redireciona para o painel admin
  if (user.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin" />;
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

        {/* Roteamento Interno do Dashboard - SEM PROP DRILLING */}
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'routes' && <RoutePlanner />}
        {currentPage === 'route-list' && <RouteList />}
        {currentPage === 'deliveries' && <DeliveryList />}
        {currentPage === 'occurrences' && <OccurrenceList />}
        {currentPage === 'customers' && <CustomerList />}
        {currentPage === 'drivers' && <DriverList />}
        {currentPage === 'vehicles' && <VehicleList />}
        {currentPage === 'sellers' && <SellerList />}
        {currentPage === 'reports' && <Reports />}
        {currentPage === 'settings' && <Settings />}
        {currentPage === 'cep-search' && <CepSearch />}
        {currentPage === 'cep-search' && <CepSearch />}

        {/* WIDGET FLUTUANTE DO LEÔNIDAS */}
        <AiChatWidget />
      </main>
    </div>
  );
};

const ProtectedLayout = (props: any) => (
  <DataProvider>
    <ProtectedLayoutContent {...props} />
  </DataProvider>
);

// --- ROTA PROTEGIDA SUPER ADMIN ---
const SuperAdminRoute = ({ user, children }: { user: any, children: JSX.Element }) => {
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/" />;
  return children;
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

  if (!authChecked) return null;

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen onLogin={refreshUser} /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* <Route path="/driver-app" element={<DriverApp />} /> */}

        <Route path="/admin" element={
          <SuperAdminRoute user={user}>
            <AdminDashboard onLogout={handleLogout} />
          </SuperAdminRoute>
        } />

        {/* Rota Protegida (Dashboard) */}
        <Route path="/*" element={<ProtectedLayout user={user} logout={handleLogout} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;