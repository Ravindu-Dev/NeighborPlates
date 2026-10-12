import { api } from './api';

export interface Vehicle {
  id: string;
  riderId: string;
  vehicleType: 'E-Bike' | 'Scooter' | 'Motorcycle' | 'Bicycle' | 'Car';
  makeModel: string;
  plateNumber: string;
  color?: string;
  year?: number;
  isPrimary: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleRequest {
  vehicleType: string;
  makeModel: string;
  plateNumber: string;
  color?: string;
  year?: number;
  isPrimary?: boolean;
}

export const vehicleService = {
  getVehicles: async (): Promise<Vehicle[]> => {
    const response = await api.get('/api/riders/vehicles');
    return response.data;
  },

  createVehicle: async (data: VehicleRequest): Promise<Vehicle> => {
    const response = await api.post('/api/riders/vehicles', data);
    return response.data;
  },

  updateVehicle: async (id: string, data: VehicleRequest): Promise<Vehicle> => {
    const response = await api.put(`/api/riders/vehicles/${id}`, data);
    return response.data;
  },

  setPrimaryVehicle: async (id: string): Promise<Vehicle> => {
    const response = await api.put(`/api/riders/vehicles/${id}/primary`);
    return response.data;
  },

  deleteVehicle: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/riders/vehicles/${id}`);
    return response.data;
  },

  deactivateRiderAccount: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.put('/api/riders/deactivate');
    return response.data;
  },

  reactivateRiderAccount: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.put('/api/riders/reactivate');
    return response.data;
  },
};
