// Types definitions for Diagnosis IA Platform

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST';
  name: String;
  crm?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  cpfHash: string;
  birthDate: string;
  gender: string;
  address?: string;
  phone?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patient: Patient;
  scheduledFor: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  checklistCompleted: boolean;
  checklistData?: string; // JSON string
  createdAt: string;
}

export interface Triage {
  id: string;
  appointmentId: string;
  patientId: string;
  heartRate?: number;
  bloodPressure?: string;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painScale?: number;
  riskClassification: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  patient: Patient;
  recordedAt: string;
  recordType: 'EVOLUTION' | 'EXAM' | 'PRESCRIPTION' | 'REFERRAL' | 'IMMUNIZATION';
  title?: string;
  content: string; // JSON string
  authorId: string;
  authorName: string;
  authorCrm?: string;
  signed: boolean;
  signatureHash?: string;
}

export interface Condition {
  id: string;
  patientId: string;
  cidCode: string;
  name: string;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
}

export interface Observation {
  id: string;
  patientId: string;
  code: string;
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  recordedAt: string;
}

export interface MedicationRequest {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  route?: string;
  recordedAt: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
}

export interface Immunization {
  id: string;
  patientId: string;
  vaccineName: string;
  doseNumber?: string;
  batch?: string;
  manufacturer?: string;
  appliedAt: string;
}

export interface Referral {
  id: string;
  patient: Patient;
  specialty: string;
  justification: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  createdAt: string;
}

export interface Bed {
  id: string;
  bedNumber: string;
  ward: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  patient?: Patient;
  updatedAt: string;
}

export interface AccessLog {
  id: string;
  patient?: Patient;
  user?: User;
  action: string;
  ipAddress: string;
  createdAt: string;
}

export interface AlertResult {
  alert: string;
  probability: number;
  factors: Record<string, number>;
  exams: string[];
  conduct: string;
}
