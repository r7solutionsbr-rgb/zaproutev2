
export enum DeliveryStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED'
}

export interface Location {
  lat: number;
  lng: number;
  address: string; // Full formatted address string for legacy support
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Customer {
  id: string;
  legalName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  cnpj: string;
  stateRegistration?: string; // Inscrição Estadual
  email: string;
  phone: string;
  whatsapp: string;
  salesperson: string; // Vendedor Responsável
  location: Location;
  addressDetails: Address;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  creditLimit?: number;
}

export interface Delivery {
  id: string;
  invoiceNumber: string;
  customer: Customer;
  volume: number; // m3
  weight: number; // kg
  value: number; // R$ Currency
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: DeliveryStatus;
  routeId?: string;
  driverId?: string;
  proofOfDelivery?: string; // base64 image
  signature?: string; // base64 signature
  timestamp?: string;
  updatedAt?: string; // <--- ADICIONE ESTA LINHA
  failureReason?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  capacityWeight: number; // kg
  capacityVolume: number; // m3
  fuelType: 'DIESEL' | 'GASOLINE' | 'ELECTRIC' | 'FLEX';
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  lastMaintenance: string;
  nextMaintenance: string;
  imageUrl?: string;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnh: string;
  cnhCategory: string;
  cnhExpiration: string;
  phone: string;
  email: string;
  vehicleId: string | null; // Assigned Vehicle
  avatarUrl: string;
  status: 'IDLE' | 'ON_ROUTE' | 'OFFLINE';
  currentLocation?: Location;
  rating: number; // 0 to 5
  totalDeliveries: number;
}

export interface Route {
  id: string;
  name: string;
  driverId: string | null;
  vehicleId: string | null;
  date: string;
  startTime?: string;
  endTime?: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  deliveries: string[]; // Delivery IDs
  estimatedDistance: number; // km
  estimatedTime: number; // minutes
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'DISPATCHER' | 'DRIVER';
  tenantId: string;
}

export interface DashboardStats {
  totalDeliveries: number;
  pending: number;
  delivered: number;
  failed: number;
  activeRoutes: number;
  onTimeRate: number;
}
