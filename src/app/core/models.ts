export interface Me {
  user: { id: string; name: string; isSuperAdmin: boolean; roleName?: string; isAdmin?: boolean; isDoctor?: boolean };
  clinic?: {
    id: string;
    name: string;
    code: string;
    logo?: string;
    phone?: string;
    address?: string;
    settings?: { currency: string; invoicePrefix: string; tagline?: string; printFooter?: string };
  };
  modules: string[];
  permissions: string[];
}

export interface Clinic {
  _id: string;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  plan: string;
  status: 'active' | 'suspended';
  expiresAt?: string;
  enabledModules: string[];
  adminUsername?: string;
  hasStoredPassword?: boolean;
  createdAt: string;
}

export interface ModuleDef {
  key: string;
  name: string;
  core: boolean;
  actions: string[];
}

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
  isAdmin: boolean;
}

export interface ClinicUser {
  _id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  isDoctor?: boolean;
  specialization?: string;
  qualification?: string;
  registrationNo?: string;
  consultationFee?: number;
  headerLines?: string;
  footerEn?: string;
  footerUr?: string;
  hasStoredPassword?: boolean;
  roleId: { _id: string; name: string; isAdmin: boolean } | null;
}

export interface PermissionGroup {
  key: string;
  name: string;
  actions: string[];
}

export interface Doctor {
  _id: string;
  name: string;
  specialization?: string;
  qualification?: string;
  registrationNo?: string;
  consultationFee?: number;
}

export interface PatientRef {
  _id: string;
  name: string;
  mrn: string;
  phone?: string;
  gender?: string;
  age?: number;
  dob?: string;
  address?: string;
  allergies?: string;
  chronicConditions?: string;
  bloodGroup?: string;
}

export interface Patient extends PatientRef {
  fatherName?: string;
  cnic?: string;
  city?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export type ApptStatus = 'scheduled' | 'waiting' | 'in-consultation' | 'completed' | 'cancelled' | 'no-show';

export interface Appointment {
  _id: string;
  patientId: PatientRef;
  doctorId: Doctor;
  date: string;
  time?: string;
  token: number;
  type: 'appointment' | 'walk-in';
  status: ApptStatus;
  reason?: string;
  visitId?: string;
}

export interface Vitals {
  bp?: string;
  pulse?: number | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  spo2?: number | null;
  sugar?: number | null;
}

// Populated references are loosely typed on purpose: list/history endpoints populate different fields.
export interface Visit {
  _id: string;
  visitNo: string;
  patientId: any;
  doctorId: any;
  appointmentId?: string;
  /** Set by the visits list when the visit has a prescription. */
  rxId?: string;
  cancelReason?: string;
  date: string;
  status: 'open' | 'completed' | 'cancelled';
  vitals?: Vitals;
  complaint?: string;
  history?: string;
  examination?: string;
  diagnosis?: string;
  notes?: string;
  followUpDate?: string;
}

export interface Medicine {
  _id: string;
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface RxItem {
  /** Set while the row was filled from the medicine list; cleared when the doctor edits a detail by hand. */
  auto?: boolean;
  medicine: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface Prescription {
  _id: string;
  rxNo: string;
  visitId: any;
  patientId: any;
  doctorId: any;
  date: string;
  items: RxItem[];
  advice?: string;
  tests?: string;
}

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  amount?: number;
}

export interface Payment {
  _id: string;
  amount: number;
  method: string;
  type: 'payment' | 'refund';
  at: string;
  day: string;
  note?: string;
}

export interface Invoice {
  _id: string;
  invoiceNo: string;
  patientId: any;
  doctorId?: any;
  visitId?: any;
  day: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  status: 'unpaid' | 'partial' | 'paid';
  payments: Payment[];
  notes?: string;
}

/** A visit from an earlier day that was never completed or cancelled. */
export interface UnfinishedVisit {
  _id: string;
  visitId: string;
  date: string;
  reason?: string;
  vitals?: Vitals;
  patient: PatientRef;
  doctor: { _id: string; name: string };
}

export interface QueueItem {
  _id: string;
  token: number;
  status: ApptStatus;
  date: string;
  createdAt: string;
  reason?: string;
  patient: PatientRef;
  doctor: { _id: string; name: string };
  visitId?: string;
  vitals?: Vitals;
  invoice: { invoiceNo: string; total: number; paid: number; balance: number; status: 'unpaid' | 'partial' | 'paid' } | null;
}
