import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API } from '../../core/api';
import { AuthService } from '../../core/auth.service';
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
  template: `
    <h3 class="mb-1">Welcome, {{ auth.me()?.user?.name }}</h3>
    @if (auth.isSuperAdmin()) {
      <p class="text-muted">Manage clinics, their plans and enabled modules from the Clinics page.</p>
    } @else {
      <p class="text-muted">{{ auth.me()?.clinic?.name }} · {{ data()?.today }}</p>
      @if (!data()) { <app-loader text="Loading today's numbers…" /> }

      <div class="row g-3 mb-4">
        @if (data()?.totalPatients !== undefined) {
          <div class="col-6 col-lg-3"><a routerLink="/patients" class="text-decoration-none"><div class="card stat-card"><div class="card-body"><div class="label">Total patients</div><div class="value">{{ data()!.totalPatients }}</div></div></div></a></div>
        }
        @if (data()?.appointments; as a) {
          <div class="col-6 col-lg-3"><a routerLink="/queue" class="text-decoration-none"><div class="card stat-card"><div class="card-body"><div class="label">Today's patients</div><div class="value">{{ total(a) }}</div><div class="small text-muted">{{ a['waiting'] || 0 }} waiting · {{ a['completed'] || 0 }} done</div></div></div></a></div>
        }
        @if (data()?.visitsToday !== undefined) {
          <div class="col-6 col-lg-3"><a routerLink="/opd" class="text-decoration-none"><div class="card stat-card"><div class="card-body"><div class="label">Visits today</div><div class="value">{{ data()!.visitsToday }}</div></div></div></a></div>
        }
        @if (data()?.collectedToday !== undefined) {
          <div class="col-6 col-lg-3"><a routerLink="/billing" class="text-decoration-none"><div class="card stat-card"><div class="card-body"><div class="label">Collected today</div><div class="value">{{ data()!.collectedToday | number: '1.0-0' }}</div></div></div></a></div>
        }
        @if (data()?.dues; as d) {
          <div class="col-6 col-lg-3"><a routerLink="/billing" [queryParams]="{ status: 'due' }" class="text-decoration-none"><div class="card stat-card"><div class="card-body"><div class="label">Outstanding dues</div><div class="value text-danger">{{ d.balance | number: '1.0-0' }}</div><div class="small text-muted">{{ d.count }} invoice(s)</div></div></div></a></div>
        }
      </div>

      <div class="d-flex gap-2 flex-wrap">
        @if (auth.hasModule('reception') && auth.has('reception.create')) { <a class="btn btn-primary" routerLink="/reception"><i class="bi bi-person-plus me-1"></i>New check-in</a> }
        @if (auth.hasModule('opd') && auth.has('opd.view')) { <a class="btn btn-outline-primary" routerLink="/queue"><i class="bi bi-people-fill me-1"></i>Pending patients</a> }
        @if (auth.hasModule('patients') && auth.has('patients.create')) { <a class="btn btn-primary" routerLink="/patients"><i class="bi bi-person-plus me-1"></i>Register patient</a> }
        @if (auth.hasModule('billing') && auth.has('billing.create')) { <a class="btn btn-outline-primary" routerLink="/billing/new"><i class="bi bi-receipt me-1"></i>New invoice</a> }
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  data = signal<Dash | null>(null);

  total = (a: Record<string, number>) => Object.values(a).reduce((s, n) => s + n, 0);

  ngOnInit() {
    if (!this.auth.isSuperAdmin()) this.http.get<Dash>(`${API}/dashboard`).subscribe((d) => this.data.set(d));
  }
}
