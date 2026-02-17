import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../api/client';

export default function ProfileScreen() {
    const router = useRouter();
    const [driver, setDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDriverProfile();
    }, []);

    const fetchDriverProfile = async () => {
        try {
            const driverId = await SecureStore.getItemAsync('driverId');
            if (driverId) {
                const response = await api.get(`/drivers/${driverId}`);
                setDriver(response.data);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            // Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Sair', 'Deseja realmente sair?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair',
                style: 'destructive',
                onPress: async () => {
                    await SecureStore.deleteItemAsync('token');
                    await SecureStore.deleteItemAsync('user');
                    await SecureStore.deleteItemAsync('driverId');
                    router.replace('/login');
                }
            }
        ]);
    };

    if (loading) {
        return <View className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center"><ActivityIndicator size="large" color="#2563eb" /></View>;
    }

    return (
        <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950 px-6 pt-16">
            <Text className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">Meu Perfil</Text>

            {/* CABEÇALHO DO MOTORISTA */}
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 flex-row items-center">
                <View className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full items-center justify-center border-2 border-blue-200 dark:border-blue-700">
                    {driver?.avatarUrl ? (
                        <Image source={{ uri: driver.avatarUrl }} className="w-full h-full rounded-full" />
                    ) : (
                        <MaterialIcons name="person" size={32} color="#2563eb" />
                    )}
                </View>
                <View className="ml-4 flex-1">
                    <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">{driver?.name || 'Motorista'}</Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-sm">ZapRoute Driver</Text>
                    <View className={`mt-2 self-start px-2 py-0.5 rounded-full ${driver?.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Text className={`text-[10px] font-bold ${driver?.status === 'ACTIVE' ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}`}>
                            {driver?.status === 'IDLE' ? 'DISPONÍVEL' : (driver?.status === 'ACTIVE' ? 'EM ROTA' : driver?.status)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* DADOS PESSOAIS */}
            <Text className="text-slate-800 dark:text-slate-200 font-bold text-lg mb-3 ml-1">Meus Dados</Text>
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 space-y-4">
                <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg items-center justify-center mr-3">
                        <MaterialIcons name="email" size={16} color="#64748b" />
                    </View>
                    <View>
                        <Text className="text-xs text-slate-400 uppercase font-bold">E-mail</Text>
                        <Text className="text-slate-700 dark:text-slate-300 font-medium">{driver?.email || 'Não informado'}</Text>
                    </View>
                </View>

                <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg items-center justify-center mr-3">
                        <MaterialIcons name="phone" size={16} color="#64748b" />
                    </View>
                    <View>
                        <Text className="text-xs text-slate-400 uppercase font-bold">Telefone</Text>
                        <Text className="text-slate-700 dark:text-slate-300 font-medium">{driver?.phone || 'Não informado'}</Text>
                    </View>
                </View>

                <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg items-center justify-center mr-3">
                        <FontAwesome5 name="id-card" size={14} color="#64748b" />
                    </View>
                    <View>
                        <Text className="text-xs text-slate-400 uppercase font-bold">CNH</Text>
                        <Text className="text-slate-700 dark:text-slate-300 font-medium">
                            {driver?.cnh || '--'} <Text className="text-slate-400 font-normal">({driver?.cnhCategory || '-'})</Text>
                        </Text>
                    </View>
                </View>
            </View>

            {/* VEÍCULO */}
            {driver?.vehicles && driver.vehicles.length > 0 && (
                <>
                    <Text className="text-slate-800 dark:text-slate-200 font-bold text-lg mb-3 ml-1">Veículo Atual</Text>
                    <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
                        <View className="flex-row justify-between items-start mb-4">
                            <View>
                                <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">{driver.vehicles[0].model}</Text>
                                <Text className="text-slate-500 dark:text-slate-400">{driver.vehicles[0].brand} • {driver.vehicles[0].year}</Text>
                            </View>
                            <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                                <Text className="text-slate-700 dark:text-slate-300 font-mono font-bold">{driver.vehicles[0].plate}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4 mt-2">
                            <View className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 items-center">
                                <Text className="text-xs text-slate-400 uppercase font-bold mb-1">Capacidade</Text>
                                <Text className="text-slate-700 dark:text-slate-300 font-bold">{driver.vehicles[0].capacityWeight}kg</Text>
                            </View>
                            <View className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 items-center">
                                <Text className="text-xs text-slate-400 uppercase font-bold mb-1">Combustível</Text>
                                <Text className="text-slate-700 dark:text-slate-300 font-bold">{driver.vehicles[0].fuelType}</Text>
                            </View>
                        </View>
                    </View>
                </>
            )}

            <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center justify-center bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 mb-10 active:bg-red-100 dark:active:bg-red-900/40"
            >
                <MaterialIcons name="logout" size={20} color="#dc2626" />
                <Text className="text-red-700 dark:text-red-400 font-bold ml-2 text-base">Sair do Aplicativo</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
