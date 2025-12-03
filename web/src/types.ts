export interface TenantConfig {
  driverImportStrategy?: 'CPF_ONLY' | 'CPF_AND_NAME' | 'STRICT';
  deliveryWorkflow?: 'SIMPLE' | 'STANDARD' | 'DETAILED';
  displaySettings?: {
    showValuesOnMobile: boolean;
    showVolumeOnMobile: boolean;
    requireProofOfDelivery: boolean;
    allowPartialDelivery: boolean;
  };
  whatsappProvider?: {
    type: 'ZAPI' | 'SENDPULSE';
    zapiInstanceId?: string;
    zapiToken?: string;
    zapiClientToken?: string;
    sendpulseClientId?: string;
    sendpulseClientSecret?: string;
    sendpulseBotId?: string;
  };
  whatsappTemplates?: {
    welcome?: string;
    greeting?: string;
    success?: string;
    failure?: string;
  };
  journeyRules?: {
    maxDrivingTime: number; // minutos
    minRestTime: number;    // minutos
    lunchTime: number;      // minutos
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'ACTIVE' | 'BLOCKED' | 'TRIAL';
  subscriptionEndsAt?: string;
  cnpj?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  config?: TenantConfig;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SUPER_ADMIN';
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  tenantId: string;
  tenant?: Tenant;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  externalId?: string;
  cnh: string;
  cnhCategory: string;
  cnhExpiration: string;
  phone: string;
  email: string;
  status: 'IDLE' | 'ON_ROUTE' | 'OFFLINE';
  avatarUrl?: string;
  rating?: number;
  totalDeliveries?: number;
  vehicleId?: string;
  vehicle?: Vehicle;
  tenantId: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  capacityWeight: number;
  capacityVolume: number;
  fuelType: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'BUSY';
  lastMaintenance?: string;
  nextMaintenance?: string;
  imageUrl?: string;
  tenantId: string;
}

export interface Customer {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  salesperson?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  creditLimit?: number;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  addressDetails?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    complement?: string;
  };
  sellerId?: string;
  seller?: Seller;
  tenantId: string;
}

export interface Seller {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  tenantId: string;
}

export type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

export interface Delivery {
  id: string;
  invoiceNumber: string;
  volume: number;
  weight: number;
  value: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: DeliveryStatus;
  product?: string;
  salesperson?: string;
  proofOfDelivery?: string;
  failureReason?: string;

  customerId: string;
  customer: Customer;

  routeId?: string;
  driverId?: string;

  createdAt: string;
  updatedAt: string;

  // Auditoria de Workflow
  arrivedAt?: string;
  unloadingStartedAt?: string;
  unloadingEndedAt?: string;
  deliveredAt?: string;
}

export interface Route {
  id: string;
  name: string;
  date: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
  startTime?: string;
  endTime?: string;
  estimatedDistance?: number;
  estimatedTime?: number;

  driverId?: string;
  driver?: Driver;

  vehicleId?: string;
  vehicle?: Vehicle;

  deliveries: string[];

  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Occurrence {
  id: string;
  type: string;
  description: string;
  driverId: string;
  driver?: Driver;
  routeId?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalDeliveries: number;
  completedDeliveries: number;
  failedDeliveries: number;
  activeRoutes: number;
  availableDrivers: number;
  revenue: number;
  onTimeRate: number;
}
