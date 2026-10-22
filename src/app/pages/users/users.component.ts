import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { copyToClipboard } from '../../core/util';
import { PasswordInputComponent } from '../../shared/password-input.component';
import { API, errorMessage } from '../../core/api';
import { HasPermissionDirective } from '../../core/has-permission.directive';
import { ClinicUser, Role } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { LoadingService } from '../../core/loading.service';

@Component({
  selector: 'app-users',
  imports: [PasswordInputComponent, FormsModule, DatePipe, HasPermissionDirective],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">Users</h3>
      <button *hasPermission="'users.create'" class="btn btn-primary" (click)="openForm()"><i class="bi bi-plus-lg me-1"></i>New user</button>
    </div>

    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr><th>Name</th><th>Username</th>@if (isAdmin()) { <th>Password</th> }<th>Role</th><th>Status</th><th>Last login</th><th class="text-end">Actions</th></tr>
          </thead>
          <tbody>
            @for (u of users(); track u._id) {
              <tr>
                <td class="fw-semibold">{{ u.name }} @if (u.isDoctor) { <span class="badge bg-info text-dark ms-1">Doctor</span> }</td>
                <td>{{ u.username }}</td>
                @if (isAdmin()) {
                  <td class="text-nowrap">
                    @if (shown()[u._id]; as pw) {
                      <code style="cursor:pointer" title="Click to copy" (click)="copyText(pw, u._id)">{{ pw }}</code>
                    @if (copiedKey() === u._id) { <span class="text-success small ms-1"><i class="bi bi-check2"></i> Copied</span> }
                      <button class="btn btn-sm btn-link p-0 ms-1" title="Copy" (click)="copyText(pw, u._id)"><i class="bi" [class.bi-clipboard]="copiedKey() !== u._id" [class.bi-clipboard-check]="copiedKey() === u._id"></i></button>
                      <button class="btn btn-sm btn-link p-0 ms-1" title="Hide" (click)="hide(u)"><i class="bi bi-eye-slash"></i></button>
                    } @else if (u.hasStoredPassword) {
                      <span class="text-muted">••••••••</span>
                      <button class="btn btn-sm btn-outline-secondary py-0 ms-1" (click)="reveal(u)">Show</button>
                    } @else {
                      <span class="text-muted small" title="Set by the user, or set before this feature. Use Edit to set a new password you can view here.">—</span>
                    }
                  </td>
                }
                <td>{{ u.roleId?.name }}</td>
                <td><span class="badge" [class.bg-success]="u.isActive" [class.bg-secondary]="!u.isActive">{{ u.isActive ? 'active' : 'inactive' }}</span></td>
                <td>{{ u.lastLogin ? (u.lastLogin | date: 'medium') : '—' }}</td>
                <td class="text-end">
                  <button *hasPermission="'users.edit'" class="btn btn-sm btn-outline-secondary me-1" (click)="openForm(u)">Edit</button>
                  @if (isAdmin()) {
                    <button class="btn btn-sm me-1" [class.btn-outline-warning]="u.isActive" [class.btn-outline-success]="!u.isActive" (click)="toggleActive(u)">
                      <i class="bi" [class.bi-snow]="u.isActive" [class.bi-play-circle]="!u.isActive"></i>
                      {{ u.isActive ? 'Freeze' : 'Unfreeze' }}
                    </button>
                    <button class="btn btn-sm btn-outline-danger" (click)="remove(u)"><i class="bi bi-trash"></i> Delete</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-center text-muted py-4">@if (loading.busy()) { <span class="spinner-border spinner-border-sm me-2"></span>Loading users… } @else { No users }</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showForm()) {
      <div class="modal d-block modal-backdrop-custom" tabindex="-1">
        <div class="modal-dialog">
          <form class="modal-content" (ngSubmit)="save()">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingId ? 'Edit user' : 'New user' }}</h5>
              <button type="button" class="btn-close" (click)="showForm.set(false)"></button>
            </div>
            <div class="modal-body">
              @if (formError()) { <div class="alert alert-danger py-2">{{ formError() }}</div> }
              <div class="mb-3"><label class="form-label">Name *</label><input class="form-control" name="name" [(ngModel)]="form.name" required /></div>
              <div class="mb-3"><label class="form-label">Username *</label><input class="form-control" name="username" [(ngModel)]="form.username" [disabled]="!!editingId" required autocomplete="off" /></div>
              <div class="mb-3">
                <label class="form-label">{{ editingId ? 'New password (leave blank to keep)' : 'Password * (min 8)' }}</label>
                <app-password-input name="password" [(ngModel)]="form.password" [required]="!editingId" autocomplete="new-password" />
              </div>
              <div class="mb-3">
                <label class="form-label">Role *</label>
                <select class="form-select" name="roleId" [(ngModel)]="form.roleId" required>
                  <option value="" disabled>Select role</option>
                  @for (r of roles(); track r._id) { <option [value]="r._id">{{ r.name }}</option> }
                </select>
              </div>
              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="isDoc" name="isDoctor" [(ngModel)]="form.isDoctor" />
                <label class="form-check-label" for="isDoc">This user is a doctor (appears in appointments, visits and billing)</label>
              </div>
              @if (form.isDoctor) {
                <div class="row g-3 mb-3 p-2 border rounded bg-light mx-0">
                  <div class="col-md-6"><label class="form-label">Specialization</label><input class="form-control" name="spec" [(ngModel)]="form.specialization" placeholder="e.g. General Physician" /></div>
                  <div class="col-md-6"><label class="form-label">Qualification</label><input class="form-control" name="qual" [(ngModel)]="form.qualification" placeholder="e.g. MBBS, FCPS" /></div>
                  <div class="col-md-6"><label class="form-label">Registration no. (PMDC)</label><input class="form-control" name="reg" [(ngModel)]="form.registrationNo" /></div>
                  <div class="col-md-6"><label class="form-label">Consultation fee</label><input type="number" min="0" class="form-control" name="fee" [(ngModel)]="form.consultationFee" /></div>
                </div>
              }
              <div class="row g-3">
                <div class="col-6"><label class="form-label">Phone</label><input class="form-control" name="phone" [(ngModel)]="form.phone" /></div>
                <div class="col-6"><label class="form-label">Email</label><input class="form-control" name="email" [(ngModel)]="form.email" /></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light" (click)="showForm.set(false)">Cancel</button>
              <button class="btn btn-primary" [disabled]="saving()">Save</button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (creds(); as c) {
      <div class="modal d-block modal-backdrop-custom" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Login details — {{ c.name }}</h5><button type="button" class="btn-close" (click)="creds.set(null)"></button></div>
            <div class="modal-body">
              <div class="alert alert-info py-2 small">You can see this password again later with "Show" until the user changes it themselves.</div>
              <table class="table table-sm mb-0">
                <tr><th>Clinic code</th><td><code>{{ auth.me()?.clinic?.code }}</code></td></tr>
                <tr><th>Username</th><td><code>{{ c.username }}</code></td></tr>
                <tr><th>Password</th><td><code>{{ c.password }}</code></td></tr>
              </table>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="copyCreds(c)">{{ copied() ? 'Copied!' : 'Copy' }}</button>
              <button class="btn btn-primary" (click)="creds.set(null)">Done</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);
  loading = inject(LoadingService);
  auth = inject(AuthService);

  /** Only the clinic admin sees (and can reveal) passwords. */
  isAdmin = () => !!this.auth.me()?.user.isAdmin;
  shown = signal<Record<string, string>>({});
  /** Login details shown once after an admin sets a password. */
  creds = signal<{ name: string; username: string; password: string } | null>(null);
  copied = signal(false);

  reveal(u: ClinicUser) {
    this.http.get<{ password: string }>(`${API}/users/${u._id}/password`).subscribe({
      next: (r) => this.shown.update((s) => ({ ...s, [u._id]: r.password })),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  hide(u: ClinicUser) {
    this.shown.update((s) => {
      const n = { ...s };
      delete n[u._id];
      return n;
    });
  }

  copiedKey = signal('');

  /** Copies the password; shows a "Copied" mark next to it for a moment. */
  copyText(text: string, key: string) {
    copyToClipboard(text).then((ok) => {
      if (!ok) return this.error.set('Could not copy. Select the password and press Ctrl+C.');
      this.copiedKey.set(key);
      setTimeout(() => this.copiedKey.set(''), 1800);
    });
  }

  copyCreds(c: { username: string; password: string }) {
    const code = this.auth.me()?.clinic?.code ?? '';
    copyToClipboard(`Clinic code: ${code}\nUsername: ${c.username}\nPassword: ${c.password}`).then((ok) => this.copied.set(ok));
  }

  users = signal<ClinicUser[]>([]);
  roles = signal<Role[]>([]);
  showForm = signal(false);
  error = signal('');
  formError = signal('');
  saving = signal(false);

  editingId = '';
  form = this.emptyForm();

  ngOnInit() {
    this.load();
    this.http.get<Role[]>(`${API}/roles`).subscribe((r) => this.roles.set(r));
  }

  private emptyForm() {
    return { name: '', username: '', password: '', roleId: '', phone: '', email: '', isDoctor: false, specialization: '', qualification: '', registrationNo: '', consultationFee: 0 };
  }

  load() {
    this.http.get<ClinicUser[]>(`${API}/users`).subscribe({
      next: (u) => this.users.set(u),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  openForm(u?: ClinicUser) {
    this.formError.set('');
    this.editingId = u?._id ?? '';
    this.form = u
      ? { name: u.name, username: u.username, password: '', roleId: u.roleId?._id ?? '', phone: u.phone ?? '', email: u.email ?? '', isDoctor: !!u.isDoctor, specialization: u.specialization ?? '', qualification: u.qualification ?? '', registrationNo: u.registrationNo ?? '', consultationFee: u.consultationFee ?? 0 }
      : this.emptyForm();
    this.showForm.set(true);
  }

  save() {
    const f = this.form;
    if (!f.name || !f.roleId || (!this.editingId && (!f.username || !f.password))) {
      this.formError.set('Please fill all required fields');
      return;
    }
    this.saving.set(true);
    const body: Record<string, unknown> = { name: f.name, roleId: f.roleId, phone: f.phone, email: f.email, isDoctor: f.isDoctor, specialization: f.specialization, qualification: f.qualification, registrationNo: f.registrationNo, consultationFee: Number(f.consultationFee) || 0 };
    if (f.password) body['password'] = f.password;
    const req = this.editingId
      ? this.http.put(`${API}/users/${this.editingId}`, body)
      : this.http.post(`${API}/users`, { ...body, username: f.username });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        if (f.password) {
          this.copied.set(false);
          this.creds.set({ name: f.name, username: f.username, password: f.password });
        }
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(errorMessage(e));
      },
    });
  }

  remove(u: ClinicUser) {
    if (!confirm(`Delete the user "${u.username}"? This cannot be undone.`)) return;
    this.http.delete(`${API}/users/${u._id}`).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  toggleActive(u: ClinicUser) {
    this.http.put(`${API}/users/${u._id}`, { isActive: !u.isActive }).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
