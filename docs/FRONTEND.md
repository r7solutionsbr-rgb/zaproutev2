# 🌐 Frontend - React/TypeScript Documentation

## 📌 Visão Geral

O frontend de ZapRoute v2 é uma aplicação web moderna construída com **React 18.2** e **TypeScript 5.3**, utilizando Vite como build tool e TailwindCSS para styling.

### Stack Tecnológico:
- **Framework:** React 18.2
- **Linguagem:** TypeScript 5.3
- **Build Tool:** Vite 5.1
- **Styling:** TailwindCSS 3.4
- **Roteamento:** React Router 6.30
- **Requisições HTTP:** Axios
- **Mapas:** Leaflet + React-Leaflet
- **Gráficos:** Recharts
- **State Management:** Context API
- **Toasts:** Sonner

---

## 📁 Estrutura de Diretórios

```
web/
├── src/
│   ├── App.tsx                     # Componente raiz com rotas
│   ├── main.tsx                    # Entrada da aplicação
│   ├── index.css                   # Estilos globais
│   ├── types.ts                    # TypeScript types globais
│   ├── constants.ts                # Constantes da aplicação
│   │
│   ├── components/                 # 🧩 Componentes Reutilizáveis
│   │   ├── Sidebar.tsx             # Navegação lateral
│   │   ├── AiChatWidget.tsx        # Chat com Gemini
│   │   ├── MapComponent.tsx        # Mapa com Leaflet
│   │   ├── RouteOptimizer.tsx      # Otimizador de rotas
│   │   ├── DataImporter.tsx        # Importador de CSV
│   │   └── ...
│   │
│   ├── pages/                      # 📄 Páginas Principais
│   │   ├── Dashboard.tsx           # Página inicial
│   │   ├── RoutePlanner.tsx        # Planejador de rotas
│   │   ├── RouteList.tsx           # Lista de rotas
│   │   ├── DeliveryList.tsx        # Entregas
│   │   ├── DriverList.tsx          # Motoristas
│   │   ├── VehicleList.tsx         # Veículos
│   │   ├── CustomerList.tsx        # Clientes
│   │   ├── SellerList.tsx          # Vendedores
│   │   ├── OccurrenceList.tsx      # Incidentes
│   │   ├── Reports.tsx             # Relatórios
│   │   ├── Settings.tsx            # Configurações
│   │   ├── DriverApp.tsx           # App do motorista
│   │   ├── LoginScreen.tsx         # Login
│   │   ├── ForgotPassword.tsx      # Recuperação de senha
│   │   ├── ResetPassword.tsx       # Reset de senha
│   │   ├── CepSearch.tsx           # Busca de CEP
│   │   ├── OccurrenceList.tsx      # Ocorrências
│   │   └── admin/
│   │       └── AdminDashboard.tsx  # Painel de admin
│   │
│   ├── components/                 # Componentes Específicos
│   │   ├── DataTable.tsx           # Tabela genérica
│   │   ├── Modal.tsx               # Modal genérico
│   │   ├── FormBuilder.tsx         # Builder de forms
│   │   ├── StatusBadge.tsx         # Badge de status
│   │   └── ...
│   │
│   ├── services/                   # 🔌 Integrações com API
│   │   └── api.ts                  # Cliente HTTP (Axios)
│   │
│   ├── contexts/                   # 🌐 State Management
│   │   └── DataContext.tsx         # Context global da app
│   │
│   ├── hooks/                      # 🎣 Custom Hooks
│   │   ├── useAuth.ts              # Hook de autenticação
│   │   ├── useFetch.ts             # Hook de requisições
│   │   ├── useForm.ts              # Hook de forms
│   │   ├── useLocalStorage.ts      # Hook de localStorage
│   │   └── ...
│   │
│   ├── utils/                      # 🔧 Funções Utilitárias
│   │   ├── format.ts               # Formatação
│   │   ├── validation.ts           # Validações
│   │   ├── geo.ts                  # Geolocalização
│   │   └── ...
│   │
│   ├── configs/                    # ⚙️ Configurações
│   │   ├── routes.config.ts        # Configuração de rotas
│   │   └── api.config.ts           # Configuração da API
│   │
│   └── vite-env.d.ts               # Tipos do Vite
│
├── public/                         # 📁 Assets Estáticos
│   ├── logo.png
│   ├── favicon.ico
│   └── ...
│
├── index.html                      # Entry Point HTML
├── vite.config.ts                  # Configuração Vite
├── tailwind.config.js              # Configuração TailwindCSS
├── postcss.config.js               # Configuração PostCSS
├── tsconfig.json                   # Configuração TypeScript
└── package.json                    # Dependencies
```

---

## 🔌 Cliente HTTP (API)

**Arquivo:** `src/services/api.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('zaproute_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado, fazer logout
      localStorage.removeItem('zaproute_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Organizar endpoints por domínio
export const api = {
  auth: {
    login: (email: string, password: string) =>
      axiosInstance.post('/auth/login', { email, password }),
    logout: () => axiosInstance.post('/auth/logout'),
  },

  drivers: {
    list: (tenantId: string) =>
      axiosInstance.get('/drivers', { params: { tenantId } }),
    get: (id: string) =>
      axiosInstance.get(`/drivers/${id}`),
    create: (data: any) =>
      axiosInstance.post('/drivers', data),
    update: (id: string, data: any) =>
      axiosInstance.patch(`/drivers/${id}`, data),
    delete: (id: string) =>
      axiosInstance.delete(`/drivers/${id}`),
  },

  routes: {
    list: (tenantId: string, days?: number) =>
      axiosInstance.get('/routes', { params: { tenantId, days } }),
    get: (id: string) =>
      axiosInstance.get(`/routes/${id}`),
    create: (data: any) =>
      axiosInstance.post('/routes', data),
    import: (data: any) =>
      axiosInstance.post('/routes/import', data),
    dashboard: (tenantId: string, days?: number) =>
      axiosInstance.get('/routes/dashboard', { params: { tenantId, days } }),
  },

  // ... mais endpoints
};
```

---

## 📄 Componentes Principais

### 1. **App.tsx** - Estrutura Principal

```typescript
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('zaproute_token');
    const userData = localStorage.getItem('zaproute_user');
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <HashRouter>
      {isLoggedIn ? (
        <DataProvider>
          <div className="flex h-screen bg-slate-50">
            <Sidebar user={user} onLogout={() => setIsLoggedIn(false)} />
            <main className="flex-1 overflow-auto">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/routes" element={<RouteList />} />
                  <Route path="/routes/new" element={<RoutePlanner />} />
                  <Route path="/drivers" element={<DriverList />} />
                  {/* ... mais rotas */}
                </Routes>
              </Suspense>
            </main>
            <AiChatWidget />
          </div>
        </DataProvider>
      ) : (
        <Routes>
          <Route path="*" element={<LoginScreen onLogin={() => setIsLoggedIn(true)} />} />
        </Routes>
      )}
    </HashRouter>
  );
}
```

### 2. **Sidebar.tsx** - Navegação

```typescript
export function Sidebar({ user, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col">
      <div className="mb-8">
        <img src="/logo.png" alt="ZapRoute" className="w-full" />
      </div>

      <nav className="flex-1 space-y-2">
        {user?.role === 'SUPER_ADMIN' && (
          <NavLink to="/admin" icon={<Shield />} label="Admin" />
        )}
        <NavLink to="/" icon={<BarChart3 />} label="Dashboard" />
        <NavLink to="/routes" icon={<Map />} label="Rotas" />
        <NavLink to="/drivers" icon={<Users />} label="Motoristas" />
        <NavLink to="/vehicles" icon={<Truck />} label="Veículos" />
        {/* ... mais links */}
      </nav>

      <button onClick={onLogout} className="w-full mt-auto py-2 px-4 bg-red-600 rounded">
        Logout
      </button>
    </aside>
  );
}
```

### 3. **Dashboard.tsx** - Página Inicial

```typescript
export function Dashboard() {
  const { data: stats } = useFetch('/routes/dashboard?days=7');
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Rotas Hoje" value={stats?.routesToday} />
        <StatCard label="Entregas" value={stats?.deliveries} />
        <StatCard label="Taxa Sucesso" value={`${stats?.successRate}%`} />
        <StatCard label="Motoristas" value={stats?.drivers} />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <ChartCard title="Entregas por Dia">
          <LineChart data={stats?.dailyDeliveries} />
        </ChartCard>
        <ChartCard title="Status das Rotas">
          <PieChart data={stats?.routeStatus} />
        </ChartCard>
      </div>
    </div>
  );
}
```

### 4. **RoutePlanner.tsx** - Planejador de Rotas

```typescript
export function RoutePlanner() {
  const [file, setFile] = useState<File | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]); // São Paulo
  const [routes, setRoutes] = useState<Route[]>([]);

  const handleImport = async (e: React.FormEvent) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.routes.import(formData);
      setRoutes(response.data);
      toast.success('Rota importada com sucesso!');
    } catch (error) {
      toast.error('Erro ao importar rota');
    }
  };

  return (
    <div className="p-8 grid grid-cols-3 gap-8">
      {/* Upload de arquivo */}
      <div className="col-span-1 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Importar Rota</h2>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />
        <button onClick={handleImport} className="w-full bg-blue-600 text-white py-2 rounded">
          Importar
        </button>
      </div>

      {/* Mapa */}
      <div className="col-span-2 bg-white rounded-lg shadow p-6">
        <MapComponent center={mapCenter} routes={routes} />
      </div>
    </div>
  );
}
```

### 5. **MapComponent.tsx** - Mapa com Leaflet

```typescript
import { MapContainer, TileLayer, Marker, Popup, FeatureGroup } from 'react-leaflet';

export function MapComponent({ center, routes }: MapComponentProps) {
  return (
    <MapContainer center={center} zoom={12} style={{ height: '600px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      <FeatureGroup>
        {routes.map((route) => (
          <div key={route.id}>
            {/* Markers para cada parada */}
            {route.deliveries.map((delivery, index) => (
              <Marker key={delivery.id} position={[delivery.latitude, delivery.longitude]}>
                <Popup>
                  <div>
                    <p><strong>Pedido:</strong> {delivery.orderId}</p>
                    <p><strong>Cliente:</strong> {delivery.customerName}</p>
                    <p><strong>Status:</strong> {delivery.status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Linha do trajeto */}
            <Polyline positions={route.path} color="blue" />
          </div>
        ))}
      </FeatureGroup>
    </MapContainer>
  );
}
```

---

## 🌐 Context API - State Management

**Arquivo:** `src/contexts/DataContext.tsx`

```typescript
interface DataContextType {
  tenantId: string;
  user: User | null;
  routes: Route[];
  drivers: Driver[];
  setRoutes: (routes: Route[]) => void;
  setDrivers: (drivers: Driver[]) => void;
  loading: boolean;
  error: string | null;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('zaproute_user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      setTenantId(parsed.tenantId);
      
      // Carregar dados iniciais
      loadRoutes(parsed.tenantId);
      loadDrivers(parsed.tenantId);
    }
  }, []);

  async function loadRoutes(tenantId: string) {
    setLoading(true);
    try {
      const response = await api.routes.list(tenantId);
      setRoutes(response.data);
    } catch (err) {
      setError('Erro ao carregar rotas');
    } finally {
      setLoading(false);
    }
  }

  // ... mais funções

  return (
    <DataContext.Provider value={{ tenantId, user, routes, drivers, setRoutes, setDrivers, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider');
  }
  return context;
}
```

---

## 🎣 Custom Hooks

### useAuth.ts
```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    localStorage.setItem('zaproute_token', response.data.access_token);
    localStorage.setItem('zaproute_user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('zaproute_token');
    localStorage.removeItem('zaproute_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return { user, isAuthenticated, login, logout };
}
```

### useFetch.ts
```typescript
export function useFetch<T = any>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    api.axiosInstance
      .get<T>(url)
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}
```

### useForm.ts
```typescript
export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = (onSubmit: (values: T) => Promise<void>) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    };
  };

  return { values, errors, touched, handleChange, handleBlur, handleSubmit, setValues };
}
```

---

## 🎨 Styling com TailwindCSS

**Configuração:** `tailwind.config.js`

```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',    // Blue
        secondary: '#10b981',  // Green
        danger: '#ef4444',     // Red
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [],
};
```

**Exemplo de Componente Styled:**
```typescript
<div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
  <h2 className="text-2xl font-bold text-slate-900 mb-4">Título</h2>
  <p className="text-slate-600 leading-relaxed">Descrição...</p>
  <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Ação
  </button>
</div>
```

---

## 📊 Páginas Principais

### Dashboard
- Cards de estatísticas
- Gráficos de entregas (linha, pizza, barra)
- Tabela de rotas recentes
- Filtros por período

### RoutePlanner
- Upload de CSV
- Visualização de mapa
- Distribuição de motoristas
- Otimização automática
- Preview antes de confirmar

### DriverList
- Tabela com todas as informações
- Busca e filtros
- Detalhes do motorista
- Histórico de rotas
- Upload de CNH/documentos

### Relatórios
- Gráficos de performance
- KPIs por período
- Exportação em PDF/Excel
- Análise comparativa

### Admin Dashboard
- Gerenciamento de tenants
- Logs de auditoria
- Estatísticas globais
- Relatórios executivos

---

## 🔄 Fluxo de Autenticação no Frontend

```
1. User acessa /login
2. Insere email + password
3. Clica "Acessar Sistema"
4. Requisição POST /api/auth/login
5. Server valida e retorna JWT + userData
6. Cliente armazena em localStorage
7. Redireciona para Dashboard
8. Todas as requisições incluem Authorization: Bearer {token}
9. Se token expirar (401), faz logout automático
```

---

## ✨ Melhorias de UX e Feedback Visual

Implementamos padrões modernos para garantir uma experiência segura e fluida:

### 1. Skeleton Loaders
Para evitar o "layout shift" e melhorar a percepção de performance, usamos telas de carregamento estruturadas:
- **`SkeletonTable`**: Usado em todas as listagens (`DriverList`, `CustomerList`, etc).
- **`SkeletonCard`**: Usado em dashboards e visualizações mobile.
- **`EmptyState`**: Componente padrão para listas vazias, incentivando a ação do usuário.

### 2. ConfirmDialog (Custom)
Substituímos o `window.confirm` nativo por um diálogo customizado:
- **Design Coerente:** Segue a identidade visual do sistema.
- **Ações Críticas:** Obrigatório para exclusões e ações destrutivas.

### 3. Feedback de Ação (Buttons)
Todos os botões de ação (`Salvar`, `Editar`, `Excluir`) suportam estados de loading:
- **Previne Cliques Duplos:** O botão é desativado durante o processamento.
- **Visual Feedback:** Uso de `Loader2` (spinner) para indicar atividade.

---

## 🔒 Segurança no Frontend

1. **HTTPS Obrigatório** - Todas as requisições via HTTPS
2. **Token em localStorage** - Seguro em navegadores modernos
3. **CSRF Token** - Enviado em headers específicos
4. **Validação de Entrada** - DTOs validados antes do envio
5. **Escape de Output** - React previne XSS automaticamente
6. **Rate Limiting** - API implementa limite de requisições

---

## 📝 Exemplo: Criar Nova Página

### 1. Criar Componente
```typescript
// src/pages/NewPage.tsx
import { useData } from '../contexts/DataContext';
import { useFetch } from '../hooks/useFetch';

export function NewPage() {
  const { tenantId } = useData();
  const { data, loading, error } = useFetch(`/api/endpoint?tenantId=${tenantId}`);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Nova Página</h1>
      {/* Conteúdo aqui */}
    </div>
  );
}
```

### 2. Adicionar Rota
```typescript
// src/App.tsx
<Route path="/new-page" element={<NewPage />} />
```

### 3. Adicionar Navegação
```typescript
// src/components/Sidebar.tsx
<NavLink to="/new-page" icon={<Icon />} label="Nova Página" />
```

---

## 🚀 Build e Deploy

```bash
# Desenvolvimento
npm run dev              # Inicia Vite dev server

# Build para produção
npm run build            # Gera dist/

# Preview do build
npm run preview          # Testa o build localmente

# Variáveis de ambiente
# .env
VITE_API_URL=http://localhost:3000/api
```

---

## 🔗 Integrações Externas

### Google Gemini (IA)
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Usar em chat widget
```

### Leaflet (Mapas)
```typescript
// Já integrado via react-leaflet
// Suporta: marcadores, polígonos, heatmaps
```

### Recharts (Gráficos)
```typescript
import { LineChart, Line, XAxis, YAxis } from 'recharts';

<LineChart data={data}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line type="monotone" dataKey="deliveries" />
</LineChart>
```

---

**Última atualização:** 15 de fevereiro de 2026
