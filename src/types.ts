export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export interface InventoryItem {
  id: string;
  group: BloodGroup;
  units: number;
  lastUpdated: any;
}

export interface Donor {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  phone: string;
  location: string;
  lastDonationDate: string;
  isAvailable: boolean;
  email?: string;
}

export interface BloodRequest {
  id: string;
  patientName: string;
  bloodGroup: BloodGroup;
  hospital: string;
  unitsNeeded: number;
  donorId?: string;
  status: 'Pending' | 'Completed' | 'Emergency';
  createdAt: any;
  notes?: string;
}

export interface EmergencyAlert {
  id: string;
  bloodGroup: BloodGroup;
  location: string;
  message: string;
  sentAt: any;
  sentBy: string;
}
