import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Linking, Platform, LayoutAnimation } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../api/client';
import { startLocationTracking } from '../../tasks/background-location';
import { useQuery } from '@tanstack/react-query';
import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect } from 'react';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { openNavigation } from '../../utils/map';

// Fetch function
const fetchDeliveries = async () => {
  const response = await api.get('/deliveries/paginated?limit=50');
  return response.data.data || [];
};

export default function HomeScreen() {
  const { isConnected } = useNetInfo();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [sortType, setSortType] = useState<'SEQUENCE' | 'DISTANCE'>('SEQUENCE');
  const [expandedHeader, setExpandedHeader] = useState(false);

  useEffect(() => {
    startLocationTracking();
  }, []);

  const { data: items = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['deliveries'],
    queryFn: fetchDeliveries,
  });

  // Calculate summary
  const total = items.length;
  const completed = items.filter((d: any) => d.status === 'COMPLETED' || d.status === 'DELIVERED').length;
  const pending = total - completed;

  // Find next pending delivery for FAB
  const nextDelivery = items.find((d: any) => d.status === 'PENDING' || d.status === 'IN_PROGRESS');

  // Filter items and Sort
  const filteredItems = items.filter((item: any) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return item.status === 'PENDING' || item.status === 'IN_PROGRESS' || item.status === 'PLANNED';
    if (filter === 'COMPLETED') return item.status === 'COMPLETED' || item.status === 'DELIVERED';
    return true;
  }).sort((a: any, b: any) => {
    if (sortType === 'DISTANCE') {
      // Mock: Sort by address length as a proxy for "random/distance" since we don't have real distance here yet
      return (a.deliveryAddress?.length || 0) - (b.deliveryAddress?.length || 0);
    }
    // Default: Sequence (ID or creation)
    return a.id.localeCompare(b.id);
  });

  useFocusEffect(
    useCallback(() => {
      if (isConnected) {
        refetch();
      }
    }, [isConnected])
  );

  const toggleHeader = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedHeader(!expandedHeader);
  };

  // ... (previous lines)

  const handleFabPress = () => {
    if (nextDelivery) {
      openNavigation(nextDelivery.deliveryLat, nextDelivery.deliveryLng, nextDelivery.deliveryAddress);
    } else {
      Alert.alert('Tudo pronto!', 'Nenhuma entrega pendente encontrada.');
    }
  };

  const renderLeftActions = (item: any) => {
    return (
      <TouchableOpacity
        className="bg-green-600 justify-center items-center w-20 rounded-2xl mb-3 ml-4"
        onPress={() => {
          if (item.customer?.phone) Linking.openURL(`tel:${item.customer.phone}`);
          else Alert.alert('Ops', 'Telefone não disponível');
        }}
      >
        <MaterialIcons name="phone" size={24} color="white" />
        <Text className="text-white text-xs font-bold mt-1">Ligar</Text>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (item: any) => {
    return (
      <TouchableOpacity
        className="bg-blue-600 justify-center items-center w-20 rounded-2xl mb-3 mr-4"
        onPress={() => {
          openNavigation(item.deliveryLat, item.deliveryLng, item.deliveryAddress);
        }}
      >
        <MaterialIcons name="map" size={24} color="white" />
        <Text className="text-white text-xs font-bold mt-1">Mapa</Text>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'PENDING': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED': return 'Entregue';
      case 'IN_PROGRESS': return 'Em Rota';
      case 'PENDING': return 'Pendente';
      default: return status;
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggleHeader}
        className="bg-slate-900 pt-12 pb-6 px-6 rounded-b-3xl shadow-lg z-10"
      >
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-slate-400 text-sm">Bem-vindo,</Text>
            <Text className="text-white text-2xl font-bold">Motorista</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity className="bg-slate-800 p-2 rounded-full border border-slate-700">
              <MaterialIcons name={expandedHeader ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="bg-slate-800 p-2 rounded-full border border-slate-700" onPress={() => router.push('/notifications')}>
              <MaterialIcons name="notifications-none" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {expandedHeader && (
          <View className="mb-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex-row justify-between">
            <View className="items-center flex-1">
              <MaterialIcons name="speed" size={20} color="#94a3b8" />
              <Text className="text-slate-400 text-xs mt-1">Estimado</Text>
              <Text className="text-white font-bold">4h 30m</Text>
            </View>
            <View className="items-center flex-1 border-l border-slate-700/50">
              <MaterialIcons name="place" size={20} color="#94a3b8" />
              <Text className="text-slate-400 text-xs mt-1">Distância</Text>
              <Text className="text-white font-bold">125 km</Text>
            </View>
            <View className="items-center flex-1 border-l border-slate-700/50">
              <MaterialIcons name="check-circle" size={20} color="#4ade80" />
              <Text className="text-slate-400 text-xs mt-1">Conclusão</Text>
              <Text className="text-white font-bold">{Math.round((completed / (total || 1)) * 100)}%</Text>
            </View>
          </View>
        )}

        <View className="flex-row justify-between bg-slate-800 p-2 rounded-xl border border-slate-700">
          <TouchableOpacity
            onPress={() => setFilter('ALL')}
            className={`flex-1 items-center p-2 rounded-lg ${filter === 'ALL' ? 'bg-slate-700' : ''}`}
          >
            <Text className={`text-xs uppercase font-bold ${filter === 'ALL' ? 'text-white' : 'text-slate-400'}`}>Total</Text>
            <Text className="text-white text-lg font-bold">{total}</Text>
          </TouchableOpacity>

          <View className="w-[1px] bg-slate-700 my-2" />

          <TouchableOpacity
            onPress={() => setFilter('COMPLETED')}
            className={`flex-1 items-center p-2 rounded-lg ${filter === 'COMPLETED' ? 'bg-green-900/30' : ''}`}
          >
            <Text className={`text-xs uppercase font-bold ${filter === 'COMPLETED' ? 'text-green-400' : 'text-slate-400'}`}>Feitas</Text>
            <Text className="text-white text-lg font-bold">{completed}</Text>
          </TouchableOpacity>

          <View className="w-[1px] bg-slate-700 my-2" />

          <TouchableOpacity
            onPress={() => setFilter('PENDING')}
            className={`flex-1 items-center p-2 rounded-lg ${filter === 'PENDING' ? 'bg-blue-900/30' : ''}`}
          >
            <Text className={`text-xs uppercase font-bold ${filter === 'PENDING' ? 'text-blue-400' : 'text-slate-400'}`}>Pendentes</Text>
            <Text className="text-white text-lg font-bold">{pending}</Text>
          </TouchableOpacity>
        </View>

        {isConnected === false && (
          <View className="mt-4 bg-red-900/50 p-2 rounded-lg items-center border border-red-800">
            <Text className="text-red-200 text-xs font-bold flex-row items-center">
              <MaterialIcons name="wifi-off" size={12} color="#fecaca" /> Modo Offline
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* BODY */}
      <View className="px-6 pt-6 pb-2 flex-row justify-between items-end">
        <View>
          <Text className="text-slate-800 dark:text-slate-100 text-lg font-bold mb-1">
            {filter === 'ALL' ? 'Todas as Entregas' : filter === 'PENDING' ? 'Entregas Pendentes' : 'Entregas Realizadas'}
          </Text>
          <Text className="text-slate-400 text-xs font-bold">{filteredItems.length} itens</Text>
        </View>

        <TouchableOpacity
          onPress={() => setSortType(prev => prev === 'SEQUENCE' ? 'DISTANCE' : 'SEQUENCE')}
          className="bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg flex-row items-center"
        >
          <MaterialIcons name="sort" size={16} color="#64748b" />
          <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold ml-1">
            {sortType === 'SEQUENCE' ? 'Sequência' : 'Distância'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && <ActivityIndicator size="large" color="#2563eb" className="mt-10" />}

        {!isLoading && filteredItems.length === 0 && (
          <View className="items-center mt-10">
            <Text className="text-slate-400 dark:text-slate-500">Nenhuma entrega encontrada.</Text>
          </View>
        )}

        {filteredItems.map((item: any) => (
          <Swipeable
            key={item.id}
            renderLeftActions={() => renderLeftActions(item)}
            renderRightActions={() => renderRightActions(item)}
            containerStyle={{ overflow: 'visible' }} // Fix for visual clipping if needed
          >
            <TouchableOpacity
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 shadow-sm border border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800"
              onPress={() => router.push(`/delivery/${item.id}`)}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className={`px-2 py-1 rounded-lg ${getStatusColor(item.status).split(' ')[0]} ${getStatusColor(item.status).split(' ')[2]}`}>
                  <Text className={`text-[10px] font-bold uppercase ${getStatusColor(item.status).split(' ')[1]} ${getStatusColor(item.status).split(' ')[3]}`}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
                <Text className="text-slate-400 text-xs font-medium flex items-center">
                  <MaterialIcons name="access-time" size={12} color="#94a3b8" /> {item.time || 'Horário indefinido'}
                </Text>
              </View>
              <Text className="text-slate-800 dark:text-slate-100 font-bold text-base mb-1">{item.customer?.tradeName || 'Cliente'}</Text>

              <View className="flex-row items-center">
                <MaterialIcons name="location-on" size={16} color="#94a3b8" />
                <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1 flex-1" numberOfLines={1}>
                  {item.deliveryAddress || 'Endereço não informado'}
                </Text>
              </View>
            </TouchableOpacity>
          </Swipeable>
        ))}
      </ScrollView>

      {/* FAB - FLOATING ACTION BUTTON */}
      {nextDelivery && (
        <TouchableOpacity
          onPress={handleFabPress}
          className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-900/30 border-4 border-white/20"
          activeOpacity={0.8}
        >
          <MaterialIcons name="near-me" size={32} color="white" />
          <View className="absolute -top-2 -right-2 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white">
            <Text className="text-white text-[10px] font-bold">1</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
