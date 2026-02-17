import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, StyleSheet, Modal, useColorScheme } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../../api/client';

export default function MapScreen() {
    const router = useRouter();
    const mapRef = useRef<MapView>(null);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const colorScheme = useColorScheme();

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão negada', 'Precisamos de acesso à localização para mostrar o mapa.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
            fetchDeliveries();
        })();
    }, []);

    const fetchDeliveries = async () => {
        setLoading(true);
        try {
            const response = await api.get('/deliveries/paginated?limit=100&status=PENDING');
            setDeliveries(response.data.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar as entregas no mapa.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerPress = (id: string) => {
        router.push(`/delivery/${id}`);
    };

    if (loading && !location) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-slate-500 dark:text-slate-400 mt-4">Carregando mapa...</Text>
            </View>
        );
    }

    // Fallback se não tiver localização
    const initialRegion = location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    } : {
        latitude: -23.55052, // SP Center fallback
        longitude: -46.633308,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    return (
        <View className="flex-1 relative bg-slate-50 dark:bg-slate-950">
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
                userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
            >
                {deliveries.map((delivery, index) => {
                    const idSum = delivery.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                    const latOffset = ((idSum % 100) - 50) * 0.001;
                    const lngOffset = ((idSum % 70) - 35) * 0.001;

                    const lat = (location?.coords.latitude || -23.55052) + latOffset;
                    const lng = (location?.coords.longitude || -46.633308) + lngOffset;

                    return (
                        <Marker
                            key={delivery.id}
                            coordinate={{ latitude: lat, longitude: lng }}
                            pinColor={delivery.priority === 'HIGH' ? 'red' : 'blue'}
                            title={delivery.customer?.tradeName}
                            description={delivery.deliveryAddress}
                            onCalloutPress={() => handleMarkerPress(delivery.id)}
                        />
                    );
                })}
            </MapView>

            <View className="absolute top-12 left-4 right-4 flex-row justify-between items-center z-10">
                <View className="bg-white dark:bg-slate-900 p-3 px-4 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 flex-row items-center">
                    <MaterialIcons name="local-shipping" size={20} color="#2563eb" />
                    <Text className="font-bold text-slate-800 dark:text-slate-100 ml-2">{deliveries.length} Entregas</Text>
                </View>

                <TouchableOpacity
                    onPress={fetchDeliveries}
                    className="bg-white dark:bg-slate-900 p-3 rounded-full shadow-md border border-slate-100 dark:border-slate-800"
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                        <MaterialIcons name="refresh" size={24} color="#2563eb" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
