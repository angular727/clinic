import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { API_HOST } from '../core/api';
import { AuthService } from '../core/auth.service';
import { LoadingService } from '../core/loading.service';
import { MENU } from '../core/menu';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="d-flex shell">
      <aside class="sidebar d-flex flex-column d-print-none">
        <div class="brand px-3 py-3">
          <i class="bi bi-heart-pulse-fill me-2"></i>
          <span>{{ auth.me()?.clinic?.name || 'Clinic Manager' }}</span>
        </div>
        <nav class="nav flex-column px-2 flex-grow-1">
          @for (item of menu(); track item.link) {
            @if (item.heading) {
              <div class="nav-heading">{{ item.heading }}</div>
            }
            <a class="nav-link" [routerLink]="item.link" routerLinkActive="active">
              <i class="bi {{ item.icon }} me-2"></i>{{ item.label }}
            </a>
          }
        </nav>
        <div class="px-3 py-3 small user-box">
          <div class="fw-semibold">{{ auth.me()?.user?.name }}</div>
          <div class="opacity-75">{{ auth.isSuperAdmin() ? 'Super Admin' : auth.me()?.user?.roleName }}</div>
          <div class="server-line mt-2" [title]="loading.online() ? 'Connected to ' + apiHost : 'Cannot reach ' + apiHost">
            <span class="dot" [class.off]="!loading.online()" [class.busy]="loading.busy()"></span>
            {{ loading.online() ? (loading.busy() ? 'Loading…' : apiHost) : 'Server unreachable' }}
          </div>
          <a routerLink="/account/password" class="btn btn-sm btn-outline-light mt-2 w-100"><i class="bi bi-key me-1"></i>Change password</a>
          <button class="btn btn-sm btn-outline-light mt-2 w-100" (click)="auth.logout()">
            <i class="bi bi-box-arrow-left me-1"></i>Logout
          </button>
        </div>
      </aside>
      <main class="flex-grow-1 p-4">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell { min-height: 100vh; }
    .sidebar { width: 240px; flex-shrink: 0; background: #0f4c4c; color: #fff; }
    .brand { font-weight: 700; font-size: 1.05rem; border-bottom: 1px solid rgba(255,255,255,.12); }
    .nav-link { color: rgba(255,255,255,.8); border-radius: .5rem; margin: 2px 0; }
    .nav-link:hover { background: rgba(255,255,255,.08); color: #fff; }
    .nav-link.active { background: #14b8a6; color: #fff; }
    .nav-heading { font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; opacity: .55; padding: 14px 12px 4px; }
    .user-box { border-top: 1px solid rgba(255,255,255,.12); }
    .server-line { font-size: .72rem; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #34d399; margin-right: 6px; }
    .dot.busy { background: #fbbf24; animation: pulse 1s infinite; }
    .dot.off { background: #f87171; }
    @keyframes pulse { 50% { opacity: .3; } }
    main { background: #f4f7f7; min-width: 0; }
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
  loading = inject(LoadingService);
  apiHost = API_HOST;

  /** Item shows only if the clinic owns the module AND the role grants the permission. */
  menu = computed(() => {
    const me = this.auth.me();
    if (!me) return [];
    const visible = MENU.filter((i) => {
      if (i.superAdminOnly) return me.user.isSuperAdmin;
      if (me.user.isSuperAdmin) return !i.module; // Super Admin has no clinic: only platform screens
      if (i.module && !this.auth.hasModule(i.module)) return false;
      if (i.permission && !this.auth.has(i.permission)) return false;
      return true;
    });
    let last: string | undefined;
    return visible.map((i) => {
      const heading = i.section && i.section !== last ? i.section : undefined;
      last = i.section;
      return { ...i, heading };
    });
  });
}
