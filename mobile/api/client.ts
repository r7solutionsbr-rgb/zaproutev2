import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ENDPOINT CONFIG
// Para Android Emulator: 10.0.2.2
// Para iOS Simulator: localhost
// Para Dispositivo Físico: SEU_IP_LOCAL (ex: 192.168.1.X)
const getBaseUrl = () => {
    // SEU IP LOCAL (Visto no Console do Metro Bundler)
    // Isso permite que dispositivos físicos na mesma rede acessem o backend
    return 'http://10.0.0.45:3333/api';
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 10000,
});

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
    unauthorizedHandler = handler;
};

// Request Interceptor: Adiciona Token
api.interceptors.request.use(async (config) => {
    try {
        console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('[API] Token attached');
        } else {
            console.log('[API] No token found in SecureStore');
        }
    } catch (error) {
        console.error('[API] Error fetching token:', error);
    }
    return config;
});

// Response Interceptor: Tratamento de Erro Global
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('driverId');
            unauthorizedHandler?.();
        }
        return Promise.reject(error);
    }
);
