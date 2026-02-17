import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import { api } from '../api/client';
import { Alert } from 'react-native';

type QueueItem = {
    id: string;
    type: 'CONFIRM_DELIVERY' | 'REPORT_FAILURE';
    payload: any;
    timestamp: number;
};

interface OfflineQueueContextData {
    queue: QueueItem[];
    addToQueue: (type: 'CONFIRM_DELIVERY' | 'REPORT_FAILURE', payload: any) => Promise<void>;
    syncQueue: () => Promise<void>;
}

const OfflineQueueContext = createContext<OfflineQueueContextData>({} as OfflineQueueContextData);

export const OfflineQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const { isConnected } = useNetInfo();

    useEffect(() => {
        loadQueue();
    }, []);

    useEffect(() => {
        if (isConnected && queue.length > 0) {
            syncQueue();
        }
    }, [isConnected, queue.length]);

    const loadQueue = async () => {
        const stored = await AsyncStorage.getItem('@offline_queue');
        if (stored) {
            setQueue(JSON.parse(stored));
        }
    };

    const saveQueue = async (newQueue: QueueItem[]) => {
        setQueue(newQueue);
        await AsyncStorage.setItem('@offline_queue', JSON.stringify(newQueue));
    };

    const addToQueue = async (type: 'CONFIRM_DELIVERY' | 'REPORT_FAILURE', payload: any) => {
        const newItem: QueueItem = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            payload,
            timestamp: Date.now(),
        };
        const newQueue = [...queue, newItem];
        await saveQueue(newQueue);
        Alert.alert('Offline', 'Ação salva na fila. Será sincronizada quando houver conexão.');
    };

    const syncQueue = async () => {
        const currentQueue = [...queue];
        const remainingQueue: QueueItem[] = [];

        for (const item of currentQueue) {
            try {
                if (item.type === 'CONFIRM_DELIVERY') {
                    // Reconstruir FormData a partir do payload se necessário
                    // Nota: FormData não serializa bem em JSON, então o payload deve guardar URIs e metadados
                    // Essa parte requer cuidado especial: Image Upload Offline é complexo.
                    // MVP: Apenas enviar dados JSON, ou assumir que a imagem está no cache local e recriar o FormData.

                    const formData = new FormData();
                    formData.append('file', {
                        uri: item.payload.photoUri,
                        name: 'proof.jpg',
                        type: 'image/jpeg'
                    } as any);

                    if (item.payload.signatureUri) {
                        formData.append('signature', {
                            uri: item.payload.signatureUri,
                            name: 'signature.png',
                            type: 'image/png'
                        } as any);
                    }

                    await api.post(`/deliveries/${item.payload.deliveryId}/confirm`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });

                } else if (item.type === 'REPORT_FAILURE') {
                    await api.post(`/deliveries/${item.payload.deliveryId}/fail`, {
                        reason: item.payload.reason
                    });
                }
            } catch (error) {
                console.error(`Falha ao sincronizar item ${item.id}`, error);
                remainingQueue.push(item); // Mantém na fila se falhar
            }
        }

        if (currentQueue.length !== remainingQueue.length) {
            Alert.alert('Sincronização', `${currentQueue.length - remainingQueue.length} itens enviados com sucesso.`);
        }

        await saveQueue(remainingQueue);
    };

    return (
        <OfflineQueueContext.Provider value={{ queue, addToQueue, syncQueue }}>
            {children}
        </OfflineQueueContext.Provider>
    );
};

export const useOfflineQueue = () => useContext(OfflineQueueContext);
