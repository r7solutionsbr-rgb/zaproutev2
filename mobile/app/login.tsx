import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token, user } = response.data;

            await SecureStore.setItemAsync('token', access_token);
            if (user?.driverId) {
                await SecureStore.setItemAsync('driverId', user.driverId);
            }

            router.replace('/(tabs)');
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao fazer login. Verifique suas credenciais.');
        }
    };

    return (
        <View className="flex-1 bg-slate-900 justify-center items-center p-6">
            <View className="w-full max-w-sm">
                <View className="items-center mb-8">
                    <Text className="text-white text-3xl font-bold tracking-tighter">ZapRoute</Text>
                    <Text className="text-slate-400 text-sm mt-2">App do Motorista</Text>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className="text-slate-300 font-medium mb-1 ml-1">E-mail</Text>
                        <TextInput
                            className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500"
                            placeholder="seu@email.com"
                            placeholderTextColor="#64748b"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View>
                        <Text className="text-slate-300 font-medium mb-1 ml-1">Senha</Text>
                        <TextInput
                            className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500"
                            placeholder="Sua senha"
                            placeholderTextColor="#64748b"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-blue-600 p-4 rounded-xl items-center mt-4 active:bg-blue-700"
                        onPress={handleLogin}
                    >
                        <Text className="text-white font-bold text-lg">Entrar</Text>
                    </TouchableOpacity>
                </View>

                <View className="mt-8 items-center">
                    <Text className="text-slate-500 text-xs">Versão 1.0.0 (Alpha)</Text>
                </View>
            </View>
        </View>
    );
}
