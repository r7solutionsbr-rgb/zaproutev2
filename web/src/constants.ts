
import { Driver, Delivery, Route, DeliveryStatus, Customer, Vehicle } from './types';

// --- VEHICLES ---
export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'V-001',
    plate: 'ABC-1234',
    brand: 'Mercedes-Benz',
    model: 'Sprinter 415',
    year: 2021,
    capacityWeight: 1500,
    capacityVolume: 10.5,
    fuelType: 'DIESEL',
    status: 'IN_USE',
    lastMaintenance: '2023-12-10',
    nextMaintenance: '2024-06-10',
    imageUrl: 'https://img.freepik.com/free-vector/white-van-vector-mockup_1051-1089.jpg' // Generic placeholder
  },
  {
    id: 'V-002',
    plate: 'XYZ-9876',
    brand: 'Fiat',
    model: 'Ducato Maxicargo',
    year: 2022,
    capacityWeight: 1600,
    capacityVolume: 12.0,
    fuelType: 'DIESEL',
    status: 'AVAILABLE',
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-07-15'
  },
  {
    id: 'V-003',
    plate: 'DEF-5678',
    brand: 'Renault',
    model: 'Master L3H2',
    year: 2020,
    capacityWeight: 1400,
    capacityVolume: 11.0,
    fuelType: 'DIESEL',
    status: 'MAINTENANCE',
    lastMaintenance: '2023-11-20',
    nextMaintenance: '2024-05-20'
  },
  {
    id: 'V-004',
    plate: 'GHI-4321',
    brand: 'Volkswagen',
    model: 'Delivery Express',
    year: 2023,
    capacityWeight: 2000,
    capacityVolume: 14.0,
    fuelType: 'DIESEL',
    status: 'IN_USE',
    lastMaintenance: '2024-02-01',
    nextMaintenance: '2024-08-01'
  },
];

// --- DRIVERS ---
export const MOCK_DRIVERS: Driver[] = [
  { 
    id: 'd1', 
    name: 'Carlos Silva', 
    cpf: '123.456.789-00',
    cnh: '12345678900',
    cnhCategory: 'AB',
    cnhExpiration: '2025-10-15',
    phone: '(11) 98765-4321',
    email: 'carlos.silva@logistica.com',
    vehicleId: 'V-001', 
    avatarUrl: 'https://picsum.photos/seed/d1/100/100', 
    status: 'ON_ROUTE', 
    currentLocation: { lat: -23.5505, lng: -46.6333, address: 'Av. Paulista, 1000' },
    rating: 4.8,
    totalDeliveries: 1250
  },
  { 
    id: 'd2', 
    name: 'Mariana Souza', 
    cpf: '987.654.321-99',
    cnh: '09876543211',
    cnhCategory: 'D',
    cnhExpiration: '2026-05-20',
    phone: '(11) 91234-5678',
    email: 'mariana.souza@logistica.com',
    vehicleId: 'V-002', 
    avatarUrl: 'https://picsum.photos/seed/d2/100/100', 
    status: 'IDLE',
    rating: 4.9,
    totalDeliveries: 890
  },
  { 
    id: 'd3', 
    name: 'Roberto Alves', 
    cpf: '456.789.123-44',
    cnh: '56789012344',
    cnhCategory: 'C',
    cnhExpiration: '2024-12-01',
    phone: '(11) 95555-4444',
    email: 'roberto.alves@logistica.com',
    vehicleId: 'V-003', 
    avatarUrl: 'https://picsum.photos/seed/d3/100/100', 
    status: 'OFFLINE',
    rating: 4.5,
    totalDeliveries: 2100
  },
  { 
    id: 'd4', 
    name: 'Julia Lima', 
    cpf: '321.654.987-22',
    cnh: '32109876522',
    cnhCategory: 'B',
    cnhExpiration: '2027-01-10',
    phone: '(11) 97777-8888',
    email: 'julia.lima@logistica.com',
    vehicleId: 'V-004', 
    avatarUrl: 'https://picsum.photos/seed/d4/100/100', 
    status: 'ON_ROUTE',
    rating: 5.0,
    totalDeliveries: 450
  },
];

const SALESPEOPLE = ['João Vendas', 'Maria Comercial', 'Pedro Representante'];

// Generate rich customers first
const generateCustomers = (count: number): Customer[] => {
  return Array.from({ length: count }).map((_, i) => {
    const isCompany = Math.random() > 0.3;
    const baseName = isCompany ? `Comercial ${i + 1} Ltda` : `Mercadinho do Bairro ${i + 1}`;
    
    return {
      id: `cust-${i}`,
      legalName: isCompany ? `Comercial de Alimentos Exemplo ${i + 1} Ltda` : `João da Silva ${i + 1} ME`,
      tradeName: baseName,
      cnpj: `${Math.floor(Math.random() * 99)}.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}/0001-${Math.floor(Math.random() * 99)}`,
      stateRegistration: `${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}`,
      email: `contato@cliente${i + 1}.com.br`,
      phone: `(11) 3000-${1000 + i}`,
      whatsapp: `(11) 9${8000 + i}-${1000 + i}`,
      salesperson: SALESPEOPLE[Math.floor(Math.random() * SALESPEOPLE.length)],
      status: Math.random() > 0.9 ? 'BLOCKED' : 'ACTIVE',
      creditLimit: Math.floor(Math.random() * 50000) + 5000,
      location: {
        lat: -23.5 + (Math.random() * 0.1 - 0.05),
        lng: -46.6 + (Math.random() * 0.1 - 0.05),
        address: `Av. Brasil, ${100 + i} - Jardins, São Paulo - SP`
      },
      addressDetails: {
        street: 'Av. Brasil',
        number: `${100 + i}`,
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        zipCode: `01430-${100 + i}`
      }
    };
  });
};

const MOCK_CUSTOMERS_LIST = generateCustomers(20);

export const MOCK_DELIVERIES: Delivery[] = Array.from({ length: 25 }).map((_, i) => {
  // Assign a random customer from the list
  const customer = MOCK_CUSTOMERS_LIST[i % MOCK_CUSTOMERS_LIST.length];

  return {
    id: `del-${i + 1}`,
    invoiceNumber: `NF-${1000 + i}`,
    customer: customer,
    volume: Math.floor(Math.random() * 10) + 1,
    weight: Math.floor(Math.random() * 50) + 5,
    value: Math.floor(Math.random() * 5000) + 500,
    priority: Math.random() > 0.8 ? 'URGENT' : 'NORMAL',
    status: i < 5 ? DeliveryStatus.DELIVERED : (i < 10 ? DeliveryStatus.IN_TRANSIT : DeliveryStatus.PENDING),
    routeId: i < 10 ? 'r-1' : (i < 18 ? 'r-2' : undefined),
    driverId: i < 10 ? 'd1' : (i < 18 ? 'd2' : undefined),
  };
});

export const MOCK_ROUTES: Route[] = [
  {
    id: 'r-1',
    name: 'Rota 101 - Zona Sul',
    driverId: 'd1',
    vehicleId: 'V-001',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '18:00',
    status: 'ACTIVE',
    deliveries: MOCK_DELIVERIES.slice(0, 10).map(d => d.id),
    estimatedDistance: 45.2,
    estimatedTime: 180
  },
  {
    id: 'r-2',
    name: 'Rota 102 - Centro Expandido',
    driverId: 'd2',
    vehicleId: 'V-002',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:30',
    endTime: '17:00',
    status: 'PLANNED',
    deliveries: MOCK_DELIVERIES.slice(10, 18).map(d => d.id),
    estimatedDistance: 32.5,
    estimatedTime: 140
  }
];
