export interface MenuItem {
  label: string;
  icon: string;
  link: string;
  /** Group heading; shown above the first visible item of each group. */
  section?: string;
  superAdminOnly?: boolean;
  /** Clinic must own this module (Super Admin controls). */
  module?: string;
  /** Role must grant this permission (Clinic Admin controls). */
  permission?: string;
}

// Add one entry here for every new module screen. The sidebar filters it automatically.
export const MENU: MenuItem[] = [
  { label: 'Dashboard', icon: 'bi-speedometer2', link: '/dashboard' },
  { label: 'Clinics', icon: 'bi-hospital', link: '/admin/clinics', superAdminOnly: true },

  { label: 'Reception', icon: 'bi-person-plus', link: '/reception', section: 'Clinic', module: 'reception', permission: 'reception.create' },
  { label: 'Pending patients', icon: 'bi-people-fill', link: '/queue', section: 'Clinic', module: 'opd', permission: 'opd.view' },
  { label: 'Patients', icon: 'bi-people', link: '/patients', section: 'Clinic', module: 'patients', permission: 'patients.view' },
  { label: 'Billing', icon: 'bi-receipt', link: '/billing', section: 'Clinic', module: 'billing', permission: 'billing.view' },
  { label: 'Reports', icon: 'bi-bar-chart-line', link: '/reports', section: 'Clinic', module: 'reports', permission: 'reports.view' },

  { label: 'Users', icon: 'bi-person-gear', link: '/settings/users', section: 'Settings', module: 'users', permission: 'users.view' },
  { label: 'Roles', icon: 'bi-shield-lock', link: '/settings/roles', section: 'Settings', module: 'users', permission: 'users.view' },
  { label: 'Clinic profile', icon: 'bi-building-gear', link: '/settings/clinic', section: 'Settings', module: 'users', permission: 'users.edit' },
];
