import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];
        if (location) {
            try {
                console.log('📍 Background Location:', location.coords.latitude, location.coords.longitude);

                const token = await SecureStore.getItemAsync('token');
                if (!token) {
                    console.log('⚠️ Background Task: No token found in SecureStore');
                    return;
                }

                await api.post('/drivers/location', {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error('Failed to send location update:', err);
            }
        }
    }
});

export async function startLocationTracking() {
    try {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            console.log('Foreground permission denied');
            return;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            console.log('Background permission denied');
            return;
        }

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10, // Atualiza a cada 10 metros
            deferredUpdatesInterval: 5000, // Mínimo 5 segundos
            showsBackgroundLocationIndicator: true,
            foregroundService: {
                notificationTitle: "ZapRoute em Execução",
                notificationBody: "Rastreando localização para entregas.",
                notificationColor: "#2563eb"
            }
        });
        console.log('🚀 Tracking started');
    } catch (e: any) {
        if (e?.message?.includes('Current location is unavailable')) {
            console.log('⚠️ Location tracking skipped: Location services are disabled or unavailable (Emulator?)');
        } else {
            console.error('Error starting location tracking:', e);
        }
    }
}

export async function stopLocationTracking() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isRegistered) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log('🛑 Tracking stopped');
        }
    } catch (e) {
        console.error('Error stopping location tracking:', e);
    }
}
