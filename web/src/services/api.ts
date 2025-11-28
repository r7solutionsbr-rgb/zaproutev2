import axios from 'axios';
import { Route, DeliveryStatus } from '../types';

// Configuração base
const client = axios.create({
  baseURL: '/api', 
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
  // --- EQUIPA (USERS) ---
  users: {
      getAll: async () => {
          const response = await client.get('/users');
          return response.data;
      },
      create: async (data: any) => {
          const response = await client.post('/users', data);
          return response.data;
      },
      delete: async (id: string) => {
          const response = await client.delete(`/users/${id}`);
          return response.data;
      }
  },
  routes: {
    getAll: async (tenantId: string) => {
      const response = await client.get(`/routes?tenantId=${tenantId}`);
      return response.data;
    },
    // --- CORREÇÃO: Método genérico para receber o objeto da rota montado ---
    import: async (data: any) => {
      const response = await client.post('/routes/import', data);
      return response.data;
    },
    // --------------------------------------------------------------------
    updateDeliveryStatus: async (id: string, status: DeliveryStatus, proofUrl?: string, failureReason?: string) => {
        const response = await client.patch(`/routes/deliveries/${id}/status`, {
            status,
            proofUrl,
            failureReason
        });
        return response.data;
    },
    // --- NOVOS MÉTODOS (Edição e Exclusão) ---
    update: async (id: string, data: any) => {
        const response = await client.patch(`/routes/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await client.delete(`/routes/${id}`);
        return response.data;
    }
  },
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
      }
  },
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
customers: {
      getAll: async (tenantId: string) => {
          const response = await client.get(`/customers?tenantId=${tenantId}`);
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
      // --- NOVO MÉTODO ---
      geocode: async (id: string) => {
          const response = await client.post(`/customers/${id}/geocode`);
          return response.data;
      },
      // ------------------
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
  }
};