import { Routes } from '@angular/router';
import { accessGuard, authGuard, superAdminGuard } from './core/guards';

// Each feature is lazy-loaded, so a module's code is only fetched when it is opened.
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      {
        path: 'admin/clinics',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./pages/clinics/clinics.component').then((m) => m.ClinicsComponent),
      },

      {
        path: 'reception',
        canActivate: [accessGuard('reception', 'reception.create')],
        loadComponent: () => import('./pages/reception/reception.component').then((m) => m.ReceptionComponent),
      },
      {
        path: 'queue',
        canActivate: [accessGuard('opd', 'opd.view')],
        loadComponent: () => import('./pages/queue/queue.component').then((m) => m.QueueComponent),
      },
      {
        path: 'patients',
        canActivate: [accessGuard('patients', 'patients.view')],
        loadComponent: () => import('./pages/patients/patients.component').then((m) => m.PatientsComponent),
      },
      {
        path: 'patients/:id',
        canActivate: [accessGuard('patients', 'patients.view')],
        loadComponent: () => import('./pages/patients/patient-detail.component').then((m) => m.PatientDetailComponent),
      },
      {
        path: 'appointments',
        canActivate: [accessGuard('appointments', 'appointments.view')],
        loadComponent: () => import('./pages/appointments/appointments.component').then((m) => m.AppointmentsComponent),
      },
      {
        path: 'opd',
        canActivate: [accessGuard('opd', 'opd.view')],
        loadComponent: () => import('./pages/opd/visits.component').then((m) => m.VisitsComponent),
      },
      {
        path: 'opd/:id',
        canActivate: [accessGuard('opd', 'opd.view')],
        loadComponent: () => import('./pages/opd/visit-detail.component').then((m) => m.VisitDetailComponent),
      },
      {
        path: 'prescriptions/:id/print',
        canActivate: [accessGuard('prescriptions', 'prescriptions.view')],
        loadComponent: () => import('./pages/prescriptions/rx-print.component').then((m) => m.RxPrintComponent),
      },
      {
        path: 'billing',
        canActivate: [accessGuard('billing', 'billing.view')],
        loadComponent: () => import('./pages/billing/invoices.component').then((m) => m.InvoicesComponent),
      },
      {
        path: 'billing/new',
        canActivate: [accessGuard('billing', 'billing.create')],
        loadComponent: () => import('./pages/billing/invoice-form.component').then((m) => m.InvoiceFormComponent),
      },
      {
        path: 'billing/:id',
        canActivate: [accessGuard('billing', 'billing.view')],
        loadComponent: () => import('./pages/billing/invoice-detail.component').then((m) => m.InvoiceDetailComponent),
      },
      {
        path: 'reports',
        canActivate: [accessGuard('reports', 'reports.view')],
        loadComponent: () => import('./pages/reports/reports.component').then((m) => m.ReportsComponent),
      },

      {
        path: 'settings/users',
        canActivate: [accessGuard('users', 'users.view')],
        loadComponent: () => import('./pages/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings/roles',
        canActivate: [accessGuard('users', 'users.view')],
        loadComponent: () => import('./pages/roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'settings/clinic',
        canActivate: [accessGuard('users', 'users.edit')],
        loadComponent: () => import('./pages/settings/clinic-profile.component').then((m) => m.ClinicProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
