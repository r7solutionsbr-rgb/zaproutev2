import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Delivery, Route, Driver, Vehicle } from '../types';

interface DataContextType {
    deliveries: Delivery[];
    routes: Route[];
    drivers: Driver[];
    vehicles: Vehicle[];
    loading: boolean;
    refreshData: () => Promise<void>;
    setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
    setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
    setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshData = useCallback(async () => {
        const userStr = localStorage.getItem('zaproute_user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user || !user.tenantId) return;

        setLoading(true);
        try {
            // 1. Rotas e Entregas (Últimos 30 dias por padrão)
            const routesData = await api.routes.getAll(user.tenantId, 30);
            const allDeliveries: Delivery[] = [];

            routesData.forEach((r: any) => {
                if (r.deliveries) {
                    r.deliveries.forEach((d: any) => {
                        if (d.customer) {
                            allDeliveries.push({
                                ...d,
                                customer: {
                                    ...d.customer,
                                    location: d.customer.location || { lat: 0, lng: 0, address: d.customer.addressDetails?.street || '' },
                                    addressDetails: d.customer.addressDetails || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' }
                                }
                            });
                        }
                    });
                }
            });

            setDeliveries(allDeliveries);
            setRoutes(routesData.map((r: any) => ({
                ...r,
                deliveries: r.deliveries ? r.deliveries.map((d: any) => d.id) : []
            })));

            // 2. Cadastros Básicos
            const [driversData, vehiclesData] = await Promise.all([
                api.drivers.getAll(user.tenantId),
                api.vehicles.getAll(user.tenantId)
            ]);
            setDrivers(driversData);
            setVehicles(vehiclesData);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carrega dados iniciais apenas uma vez ao montar o Provider
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return (
        <DataContext.Provider value={{
            deliveries, routes, drivers, vehicles, loading, refreshData,
            setRoutes, setDeliveries, setDrivers, setVehicles
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
