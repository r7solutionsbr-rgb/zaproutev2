import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function NotificationsScreen() {
    // Mock Notifications - Em produção isso viria de uma API ou LocalStorage
    const notifications = [
        {
            id: '1',
            title: 'Rota Atualizada',
            message: 'A entrega #9823 foi removida da sua rota pela central.',
            time: '10:30',
            read: false,
            type: 'warning'
        },
        {
            id: '2',
            title: 'Bem-vindo!',
            message: 'Bem-vindo ao ZapRoute! Tenha um ótimo dia de trabalho.',
            time: '08:00',
            read: true,
            type: 'info'
        },
        {
            id: '3',
            title: 'Sincronização Concluída',
            message: 'Todas as suas entregas offline foram enviadas com sucesso.',
            time: 'Ontem',
            read: true,
            type: 'success'
        }
    ];

    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <Stack.Screen options={{ title: 'Notificações', headerBackTitle: 'Voltar' }} />

            <ScrollView className="flex-1 p-4">
                {notifications.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        className={`p-4 rounded-xl mb-3 border ${item.read ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'}`}
                    >
                        <View className="flex-row items-start">
                            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${item.type === 'warning' ? 'bg-yellow-100' : item.type === 'success' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                <MaterialIcons
                                    name={item.type === 'warning' ? 'priority-high' : item.type === 'success' ? 'check' : 'info'}
                                    size={20}
                                    color={item.type === 'warning' ? '#ca8a04' : item.type === 'success' ? '#16a34a' : '#2563eb'}
                                />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className={`font-bold text-base ${item.read ? 'text-slate-800 dark:text-slate-200' : 'text-slate-900 dark:text-white'}`}>
                                        {item.title}
                                    </Text>
                                    <Text className="text-xs text-slate-400">{item.time}</Text>
                                </View>
                                <Text className="text-slate-500 dark:text-slate-400 text-sm leading-5">
                                    {item.message}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                {notifications.length === 0 && (
                    <View className="items-center justify-center mt-20">
                        <MaterialIcons name="notifications-none" size={48} color="#cbd5e1" />
                        <Text className="text-slate-400 mt-4 text-center">Nenhuma notificação por enquanto.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
