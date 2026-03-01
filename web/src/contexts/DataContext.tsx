import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { api } from '../services/api';
import { Driver, Vehicle, Delivery } from '../types';

interface DataContextType {
  drivers: Driver[];
  vehicles: Vehicle[];
  deliveries: Delivery[];
  loading: boolean;
  refreshData: () => Promise<void>;
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = useCallback(async () => {
    const userStr = localStorage.getItem('zaproute_user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user || !user.tenantId) return;

    setLoading(true);
    try {
      // Carrega apenas cadastros básicos leves
      // Rotas e Entregas agora são carregadas localmente nas páginas c/ paginação
      const [driversResponse, vehiclesResponse] = await Promise.all([
        api.drivers.getAll(user.tenantId),
        api.vehicles.getAll(user.tenantId),
      ]);
      setDrivers(driversResponse.data || []);
      setVehicles(vehiclesResponse.data || []);
      // setDeliveries(deliveriesData); // Se implementado API
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega dados iniciais apenas uma vez ao montar o Provider
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <DataContext.Provider
      value={{
        drivers,
        vehicles,
        deliveries,
        loading,
        refreshData,
        setDrivers,
        setVehicles,
        setDeliveries,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
