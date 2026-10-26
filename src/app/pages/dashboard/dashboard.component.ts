import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { QueueItem } from '../../core/models';
import { LoaderComponent } from '../../shared/loader.component';

interface Dash {
  today: string;
  totalPatients?: number;
  appointments?: Record<string, number>;
  visitsToday?: number;
  collectedToday?: number;
  dues?: { balance: number; count: number };
}

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterLink, LoaderComponent],
  styles: `
    .hero { background: linear-gradient(135deg, #0f4c4c 0%, #0f766e 100%); color: #fff; border-radius: 1rem; padding: 1.5rem 1.75rem; }
    .hero .sub { opacity: 0.8; }
    .tile { display: block; background: #fff; border-radius: 0.9rem; padding: 1rem 1.1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07); color: inherit; text-decoration: none; height: 100%; transition: transform 0.12s, box-shadow 0.12s; }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(15, 76, 76, 0.12); color: inherit; }
    .icon { width: 42px; height: 42px; border-radius: 0.7rem; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
    .label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #6c757d; }
    .value { font-size: 1.9rem; font-weight: 700; line-height: 1.1; color: #134e4a; }
    .token { background: #134e4a; color: #fff; border-radius: 0.5rem; min-width: 34px; text-align: center; font-weight: 700; padding: 2px 6px; }
  `,
  template: `
    @if (auth.isSuperAdmin()) {
      <h3 class="mb-1">Welcome, {{ auth.me()?.user?.name }}</h3>
      <p class="text-muted">Manage clinics, their plans and enabled modules from the Clinics page.</p>
    } @else {
      <div class="hero mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <div class="sub small">{{ greeting() }}</div>
          <h3 class="mb-1">{{ auth.me()?.user?.name }}</h3>
          <div class="sub small"><i class="bi bi-building me-1"></i>{{ auth.me()?.clinic?.name }} <span class="mx-1">·</span> <i class="bi bi-calendar3 me-1"></i>{{ prettyDate() }}</div>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          @if (auth.hasModule('reception') && auth.has('reception.create')) { <a class="btn btn-light" routerLink="/reception"><i class="bi bi-person-plus me-1"></i>New check-in</a> }
          @if (auth.hasModule('opd') && auth.has('opd.view')) { <a class="btn btn-outline-light" routerLink="/queue"><i class="bi bi-people-fill me-1"></i>Pending patients</a> }
          @if (auth.hasModule('patients') && auth.has('patients.create')) { <a class="btn btn-outline-light" routerLink="/patients"><i class="bi bi-person-vcard me-1"></i>Register patient</a> }
          @if (auth.hasModule('billing') && auth.has('billing.create')) { <a class="btn btn-outline-light" routerLink="/billing/new"><i class="bi bi-receipt me-1"></i>New invoice</a> }
        </div>
      </div>

      @if (!data()) { <app-loader text="Loading today's numbers…" /> }

      <div class="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3 mb-4">
        @if (data()?.totalPatients !== undefined) {
          <div class="col"><a routerLink="/patients" class="tile d-flex gap-3 align-items-center">
            <span class="icon" style="background:#e0f2f1;color:#0f766e"><i class="bi bi-people"></i></span>
            <div><div class="label">Total patients</div><div class="value">{{ data()!.totalPatients }}</div></div>
          </a></div>
        }
        @if (data()?.appointments; as a) {
          <div class="col"><a routerLink="/queue" class="tile d-flex gap-3 align-items-center">
            <span class="icon" style="background:#e0f2fe;color:#0369a1"><i class="bi bi-person-lines-fill"></i></span>
            <div><div class="label">Today's patients</div><div class="value">{{ total(a) }}</div><div class="small text-muted">{{ a['waiting'] || 0 }} waiting · {{ a['completed'] || 0 }} done</div></div>
          </a></div>
        }
        @if (data()?.visitsToday !== undefined) {
          <div class="col"><a routerLink="/opd" class="tile d-flex gap-3 align-items-center">
            <span class="icon" style="background:#ede9fe;color:#6d28d9"><i class="bi bi-journal-medical"></i></span>
            <div><div class="label">Visits today</div><div class="value">{{ data()!.visitsToday }}</div></div>
          </a></div>
        }
        @if (data()?.collectedToday !== undefined) {
          <div class="col"><a routerLink="/billing" class="tile d-flex gap-3 align-items-center">
            <span class="icon" style="background:#dcfce7;color:#15803d"><i class="bi bi-cash-coin"></i></span>
            <div><div class="label">Collected today</div><div class="value">{{ data()!.collectedToday | number: '1.0-0' }}</div></div>
          </a></div>
        }
        @if (data()?.dues; as d) {
          <div class="col"><a routerLink="/billing" [queryParams]="{ status: 'due' }" class="tile d-flex gap-3 align-items-center">
            <span class="icon" style="background:#fee2e2;color:#b91c1c"><i class="bi bi-exclamation-circle"></i></span>
            <div><div class="label">Outstanding dues</div><div class="value text-danger">{{ d.balance | number: '1.0-0' }}</div><div class="small text-muted">{{ d.count }} invoice(s)</div></div>
          </a></div>
        }
      </div>

      @if (canQueue()) {
        <div class="card border-0 shadow-sm" style="border-radius: 0.9rem">
          <div class="card-header bg-white d-flex justify-content-between align-items-center" style="border-radius: 0.9rem 0.9rem 0 0">
            <span class="fw-semibold"><i class="bi bi-hourglass-split me-1 text-muted"></i>Waiting now</span>
            <a routerLink="/queue" class="small text-decoration-none">See all <i class="bi bi-arrow-right"></i></a>
          </div>
          <div class="list-group list-group-flush">
            @for (q of waiting(); track q._id) {
              <a routerLink="/queue" class="list-group-item list-group-item-action d-flex align-items-center gap-3">
                <span class="token">#{{ q.token }}</span>
                <div class="flex-grow-1 text-truncate">
                  <span class="fw-semibold">{{ q.patient.name }}</span>
                  <span class="text-muted small ms-1">{{ q.patient.mrn }}</span>
                  @if (q.reason) { <div class="small text-muted text-truncate">{{ q.reason }}</div> }
                </div>
                <span class="badge" [class]="q.status === 'in-consultation' ? 'bg-info' : 'bg-warning text-dark'">{{ q.status === 'in-consultation' ? 'with doctor' : 'waiting' }}</span>
              </a>
            } @empty {
              <div class="list-group-item text-muted text-center py-4">No patients waiting right now.</div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  data = signal<Dash | null>(null);
  waiting = signal<QueueItem[]>([]);

  total = (a: Record<string, number>) => Object.values(a).reduce((s, n) => s + n, 0);
  canQueue = () => this.auth.hasModule('opd') && this.auth.has('opd.view');

  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  prettyDate() {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  ngOnInit() {
    if (this.auth.isSuperAdmin()) return;
    this.http.get<Dash>(`${API}/dashboard`).subscribe((d) => this.data.set(d));
    if (this.canQueue()) {
      this.http.get<QueueItem[]>(`${API}/reception/queue`).subscribe({ next: (q) => this.waiting.set(q.slice(0, 6)), error: () => {} });
    }
  }
}
