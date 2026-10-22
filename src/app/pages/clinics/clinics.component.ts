import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API, errorMessage } from '../../core/api';
import { Clinic, ModuleDef } from '../../core/models';
import { LoadingService } from '../../core/loading.service';

@Component({
  selector: 'app-clinics',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">Clinics</h3>
      <button class="btn btn-primary" (click)="openCreate()"><i class="bi bi-plus-lg me-1"></i>New clinic</button>
    </div>

    @if (error()) {
      <div class="alert alert-danger py-2">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="alert alert-success py-2">{{ notice() }}</div>
    }

    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Name</th>
              <th>Clinic code</th>
              <th>Admin username</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Optional modules</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of clinics(); track c._id) {
              <tr>
                <td class="fw-semibold">{{ c.name }}</td>
                <td><code>{{ c.code }}</code></td>
                <td><code>{{ c.adminUsername || '—' }}</code></td>
                <td>
                  <span class="badge" [class.bg-success]="c.status === 'active'" [class.bg-danger]="c.status === 'suspended'">{{ c.status }}</span>
                </td>
                <td>{{ c.expiresAt ? (c.expiresAt | date: 'mediumDate') : '—' }}</td>
                <td>{{ c.enabledModules.length ? c.enabledModules.join(', ') : '—' }}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-secondary me-1" (click)="openModules(c)">Modules</button>
                  <button class="btn btn-sm btn-outline-secondary me-1" (click)="openReset(c)">Reset admin password</button>
                  <button class="btn btn-sm" [class.btn-outline-danger]="c.status === 'active'" [class.btn-outline-success]="c.status === 'suspended'" (click)="toggleStatus(c)">
                    {{ c.status === 'active' ? 'Suspend' : 'Activate' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-center text-muted py-4">@if (loading.busy()) { <span class="spinner-border spinner-border-sm me-2"></span>Loading clinics… } @else { No clinics yet }</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create clinic -->
    @if (mode() === 'create') {
      <div class="modal d-block modal-backdrop-custom" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <form class="modal-content" (ngSubmit)="create()">
            <div class="modal-header"><h5 class="modal-title">New clinic</h5><button type="button" class="btn-close" (click)="close()"></button></div>
            <div class="modal-body">
              @if (formError()) { <div class="alert alert-danger py-2">{{ formError() }}</div> }
              <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Clinic name *</label><input class="form-control" name="name" [(ngModel)]="form.name" required /></div>
                <div class="col-md-6"><label class="form-label">Login code * <small class="text-muted">(lowercase, used at login)</small></label><input class="form-control" name="code" [(ngModel)]="form.code" required /></div>
                <div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" name="phone" [(ngModel)]="form.phone" /></div>
                <div class="col-md-6"><label class="form-label">Subscription expires</label><input type="date" class="form-control" name="expiresAt" [(ngModel)]="form.expiresAt" /></div>
                <div class="col-12"><label class="form-label">Address</label><input class="form-control" name="address" [(ngModel)]="form.address" /></div>
                <div class="col-12"><hr class="my-1" /><div class="fw-semibold">Clinic admin</div></div>
                <div class="col-md-4"><label class="form-label">Name *</label><input class="form-control" name="an" [(ngModel)]="form.adminName" required /></div>
                <div class="col-md-4"><label class="form-label">Username *</label><input class="form-control" name="au" [(ngModel)]="form.adminUsername" required autocomplete="off" /></div>
                <div class="col-md-4"><label class="form-label">Password * <small class="text-muted">(min 8)</small></label><input type="password" class="form-control" name="ap" [(ngModel)]="form.adminPassword" required autocomplete="new-password" /></div>
                @if (optionalModules().length) {
                  <div class="col-12"><hr class="my-1" /><div class="fw-semibold mb-1">Optional modules</div>
                    @for (m of optionalModules(); track m.key) {
                      <div class="form-check form-check-inline">
                        <input class="form-check-input" type="checkbox" [id]="'c-' + m.key" [checked]="form.modules.includes(m.key)" (change)="toggle(form.modules, m.key)" />
                        <label class="form-check-label" [for]="'c-' + m.key">{{ m.name }}</label>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-light" (click)="close()">Cancel</button><button class="btn btn-primary" [disabled]="saving()">Create clinic</button></div>
          </form>
        </div>
      </div>
    }

    <!-- Modules -->
    @if (mode() === 'modules' && selected(); as c) {
      <div class="modal d-block modal-backdrop-custom" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Modules — {{ c.name }}</h5><button type="button" class="btn-close" (click)="close()"></button></div>
            <div class="modal-body">
              @if (formError()) { <div class="alert alert-danger py-2">{{ formError() }}</div> }
              <p class="text-muted small">Core modules (patients, appointments, OPD, prescriptions, billing, reports, users) are always on. Turning a module off hides it; its data is kept.</p>
              @for (m of optionalModules(); track m.key) {
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" [id]="'m-' + m.key" [checked]="modulesDraft.includes(m.key)" (change)="toggle(modulesDraft, m.key)" />
                  <label class="form-check-label" [for]="'m-' + m.key">{{ m.name }}</label>
                </div>
              } @empty {
                <div class="text-muted">No optional modules exist yet. They will appear here as they are built.</div>
              }
            </div>
            <div class="modal-footer"><button class="btn btn-light" (click)="close()">Close</button>
              @if (optionalModules().length) { <button class="btn btn-primary" [disabled]="saving()" (click)="saveModules()">Save</button> }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Login details (password is only known right after create/reset) -->
    @if (credentials(); as cr) {
      <div class="modal d-block modal-backdrop-custom" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Login details — {{ cr.clinicName }}</h5><button type="button" class="btn-close" (click)="credentials.set(null)"></button></div>
            <div class="modal-body">
              <div class="alert alert-warning py-2 small">The password is shown only now. It is stored encrypted and cannot be viewed later. Copy it and give it to the clinic admin.</div>
              <table class="table table-sm mb-0">
                <tr><th>Clinic code</th><td><code>{{ cr.code }}</code></td></tr>
                <tr><th>Username</th><td><code>{{ cr.username }}</code></td></tr>
                <tr><th>Password</th><td><code>{{ cr.password }}</code></td></tr>
              </table>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="copyCredentials(cr)">{{ copied() ? 'Copied!' : 'Copy' }}</button>
              <button class="btn btn-primary" (click)="credentials.set(null)">Done</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Reset admin password -->
    @if (mode() === 'reset' && selected(); as c) {
      <div class="modal d-block modal-backdrop-custom" tabindex="-1">
        <div class="modal-dialog">
          <form class="modal-content" (ngSubmit)="resetPassword()">
            <div class="modal-header"><h5 class="modal-title">Reset admin password — {{ c.name }}</h5><button type="button" class="btn-close" (click)="close()"></button></div>
            <div class="modal-body">
              @if (formError()) { <div class="alert alert-danger py-2">{{ formError() }}</div> }
              <label class="form-label">New password <small class="text-muted">(min 8)</small></label>
              <input type="password" class="form-control" name="np" [(ngModel)]="newPassword" required autocomplete="new-password" />
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-light" (click)="close()">Cancel</button><button class="btn btn-primary" [disabled]="saving()">Reset</button></div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClinicsComponent implements OnInit {
  private http = inject(HttpClient);
  loading = inject(LoadingService);

  clinics = signal<Clinic[]>([]);
  optionalModules = signal<ModuleDef[]>([]);
  mode = signal<'' | 'create' | 'modules' | 'reset'>('');
  selected = signal<Clinic | null>(null);
  error = signal('');
  notice = signal('');
  formError = signal('');
  saving = signal(false);
  credentials = signal<{ clinicName: string; code: string; username: string; password: string } | null>(null);
  copied = signal(false);

  form = this.emptyForm();
  modulesDraft: string[] = [];
  newPassword = '';

  ngOnInit() {
    this.load();
    this.http.get<ModuleDef[]>(`${API}/auth/modules`).subscribe((m) => this.optionalModules.set(m.filter((x) => !x.core)));
  }

  private emptyForm() {
    return { name: '', code: '', phone: '', address: '', expiresAt: '', adminName: '', adminUsername: '', adminPassword: '', modules: [] as string[] };
  }

  load() {
    this.http.get<Clinic[]>(`${API}/clinics`).subscribe({
      next: (c) => this.clinics.set(c),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  toggle(list: string[], key: string) {
    const i = list.indexOf(key);
    i >= 0 ? list.splice(i, 1) : list.push(key);
  }

  openCreate() {
    this.form = this.emptyForm();
    this.formError.set('');
    this.mode.set('create');
  }

  openModules(c: Clinic) {
    this.selected.set(c);
    this.modulesDraft = [...c.enabledModules];
    this.formError.set('');
    this.mode.set('modules');
  }

  openReset(c: Clinic) {
    this.selected.set(c);
    this.newPassword = '';
    this.formError.set('');
    this.mode.set('reset');
  }

  close() {
    this.mode.set('');
    this.selected.set(null);
  }

  private done(message: string) {
    this.saving.set(false);
    this.close();
    this.notice.set(message);
    this.error.set('');
    this.load();
    setTimeout(() => this.notice.set(''), 4000);
  }

  private fail(e: unknown) {
    this.saving.set(false);
    this.formError.set(errorMessage(e));
  }

  create() {
    const f = this.form;
    this.formError.set('');
    if (!f.name || !f.code || !f.adminName || !f.adminUsername || !f.adminPassword) {
      this.formError.set('Please fill all required fields');
      return;
    }
    this.saving.set(true);
    this.http
      .post(`${API}/clinics`, {
        name: f.name,
        code: f.code,
        phone: f.phone,
        address: f.address,
        expiresAt: f.expiresAt || undefined,
        enabledModules: f.modules,
        admin: { name: f.adminName, username: f.adminUsername, password: f.adminPassword },
      })
      .subscribe({
        next: () => {
          const shown = { clinicName: f.name, code: f.code.toLowerCase().trim(), username: f.adminUsername.toLowerCase().trim(), password: f.adminPassword };
          this.done('Clinic created');
          this.showCredentials(shown);
        },
        error: (e) => this.fail(e),
      });
  }

  private showCredentials(c: { clinicName: string; code: string; username: string; password: string }) {
    this.copied.set(false);
    this.credentials.set(c);
  }

  copyCredentials(c: { code: string; username: string; password: string }) {
    const text = `Clinic code: ${c.code}\nUsername: ${c.username}\nPassword: ${c.password}`;
    navigator.clipboard?.writeText(text).then(() => this.copied.set(true));
  }

  saveModules() {
    const c = this.selected();
    if (!c) return;
    this.saving.set(true);
    this.http.put(`${API}/clinics/${c._id}/modules`, { enabledModules: this.modulesDraft }).subscribe({
      next: () => this.done('Modules updated'),
      error: (e) => this.fail(e),
    });
  }

  resetPassword() {
    const c = this.selected();
    if (!c) return;
    this.saving.set(true);
    const password = this.newPassword;
    this.http.post(`${API}/clinics/${c._id}/reset-admin-password`, { password }).subscribe({
      next: () => {
        this.done('Admin password reset');
        this.showCredentials({ clinicName: c.name, code: c.code, username: c.adminUsername || '', password });
      },
      error: (e) => this.fail(e),
    });
  }

  toggleStatus(c: Clinic) {
    const status = c.status === 'active' ? 'suspended' : 'active';
    this.http.put(`${API}/clinics/${c._id}/status`, { status }).subscribe({
      next: () => this.done(`Clinic ${status === 'active' ? 'activated' : 'suspended'}`),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
