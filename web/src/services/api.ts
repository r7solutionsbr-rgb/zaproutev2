import axios from 'axios';
import { Route, DeliveryStatus } from '../types';

// Configuração base
const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para injetar o Token
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('zaproute_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para lidar com Token Expirado (401)
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('zaproute_token');
            localStorage.removeItem('zaproute_user');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const api = {
    auth: {
        login: async (email: string, password?: string) => {
            const response = await client.post('/auth/login', { email, password });
            return response.data;
        },
        forgotPassword: async (email: string) => {
            const response = await client.post('/auth/forgot-password', { email });
            return response.data;
        },
        resetPassword: async (token: string, password: string) => {
            const response = await client.post('/auth/reset-password', { token, password });
            return response.data;
        }
    },
    // --- EMPRESA (TENANT) ---
    tenants: {
        getMe: async () => {
            const response = await client.get('/tenants/me');
            return response.data;
        },
        updateMe: async (data: any) => {
            const response = await client.patch('/tenants/me', data);
            return response.data;
        }
    },
    // --- EQUIPE (USERS) ---
    users: {
        getAll: async () => {
            const response = await client.get('/users');
            return response.data;
        },
        create: async (data: any) => {
            const response = await client.post('/users', data);
            return response.data;
        },
        update: async (id: string, data: any) => { // <--- ADICIONADO AGORA
            const response = await client.patch(`/users/${id}`, data);
            return response.data;
        },
        delete: async (id: string) => {
            const response = await client.delete(`/users/${id}`);
            return response.data;
        }
    },
    // --- ROTAS ---
    routes: {
        getAll: async (tenantId: string, days = 30) => { // <--- COM FILTRO DE DIAS
            const response = await client.get(`/routes?tenantId=${tenantId}&days=${days}`);
            return response.data;
        },
        import: async (data: any) => {
            const response = await client.post('/routes/import', data);
            return response.data;
        },
        updateDeliveryStatus: async (id: string, status: DeliveryStatus, proofUrl?: string, failureReason?: string, options?: { arrivedAt?: string, unloadingStartedAt?: string, unloadingEndedAt?: string }) => {
            const response = await client.patch(`/routes/deliveries/${id}/status`, {
                status,
                proofUrl,
                failureReason,
                ...options
            });
            return response.data;
        },
        update: async (id: string, data: any) => {
            const response = await client.patch(`/routes/${id}`, data);
            return response.data;
        },
        delete: async (id: string) => {
            const response = await client.delete(`/routes/${id}`);
            return response.data;
        }
    },
    // --- MOTORISTAS ---
    drivers: {
        getAll: async (tenantId: string) => {
            const response = await client.get(`/drivers?tenantId=${tenantId}`);
            return response.data;
        },
        create: async (data: any) => {
            const response = await client.post('/drivers', data);
            return response.data;
        },
        update: async (id: string, data: any) => {
            const response = await client.patch(`/drivers/${id}`, data);
            return response.data;
        },
        import: async (tenantId: string, drivers: any[]) => {
            const response = await client.post('/drivers/import', { tenantId, drivers });
            return response.data;
        },
        getAiAnalysis: async (id: string) => {
            const response = await client.get(`/drivers/${id}/ai-analysis`);
            return response.data;
        }
    },
    // --- VEÍCULOS ---
    vehicles: {
        getAll: async (tenantId: string) => {
            const response = await client.get(`/vehicles?tenantId=${tenantId}`);
            return response.data;
        },
        create: async (data: any) => {
            const response = await client.post('/vehicles', data);
            return response.data;
        },
        update: async (id: string, data: any) => {
            const response = await client.patch(`/vehicles/${id}`, data);
            return response.data;
        },
        import: async (tenantId: string, vehicles: any[]) => {
            const response = await client.post('/vehicles/import', { tenantId, vehicles });
            return response.data;
        }
    },
    // --- VENDEDORES ---
    sellers: {
        getAll: async (tenantId: string) => {
            const response = await client.get(`/sellers?tenantId=${tenantId}`);
            return response.data;
        },
        create: async (data: any) => {
            const response = await client.post('/sellers', data);
            return response.data;
        },
        update: async (id: string, data: any) => {
            const response = await client.patch(`/sellers/${id}`, data);
            return response.data;
        },
        remove: async (id: string) => {
            const response = await client.delete(`/sellers/${id}`);
            return response.data;
        }
    },
    // --- CLIENTES ---
    customers: {
        // AGORA COM PAGINAÇÃO
        getAll: async (tenantId: string, page = 1, limit = 10, search = '') => {
            const response = await client.get(`/customers`, {
                params: { tenantId, page, limit, search }
            });
            return response.data;
        },
        create: async (data: any) => {
            const response = await client.post('/customers', data);
            return response.data;
        },
        update: async (id: string, data: any) => {
            const response = await client.patch(`/customers/${id}`, data);
            return response.data;
        },
        geocode: async (id: string) => {
            const response = await client.post(`/customers/${id}/geocode`);
            return response.data;
        },
        import: async (tenantId: string, customers: any[]) => {
            const response = await client.post('/customers/import', { tenantId, customers });
            return response.data;
        }
    },
    setup: {
        runSeed: async () => {
            const response = await client.post('/setup/seed');
            return response.data;
        }
    },
    health: {
        checkDb: async () => {
            const response = await client.get('/health/db');
            return response.data;
        }
    },
    journey: {
        createEvent: async (data: any) => {
            const response = await client.post('/journey/event', data);
            return response.data;
        },
        getHistory: async (driverId: string, date?: string) => {
            const response = await client.get(`/journey/${driverId}/history${date ? `?date=${date}` : ''}`);
            return response.data;
        }
    },
    backoffice: {
        getAllTenants: async () => {
            const response = await client.get('/backoffice/tenants');
            return response.data;
        },
        createTenant: async (data: any) => {
            const response = await client.post('/backoffice/tenants', data);
            return response.data;
        },
        updateTenantStatus: async (id: string, status: string) => {
            const response = await client.patch(`/backoffice/tenants/${id}/status`, { status });
            return response.data;
        },
        updateTenant: async (id: string, data: any) => {
            const response = await client.patch(`/backoffice/tenants/${id}`, data);
            return response.data;
        }
    },
    storage: {
        upload: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await client.post('/storage/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data; // { url: string }
        },
    },
    ai: {
        chat: async (message: string, context?: string) => {
            const response = await client.post('/ai/chat', { message, context });
            return response.data;
        }
    }
};