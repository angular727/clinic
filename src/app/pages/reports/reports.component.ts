import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API, errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { Doctor } from '../../core/models';
import { LoadingService } from '../../core/loading.service';
import { today } from '../../core/util';

interface Daily {
  date: string;
  received: number;
  refunded: number;
  net: number;
  byMethod: Record<string, number>;
  collectedByDoctor: { doctor: string; collected: number }[];
  billedByDoctor: { doctor: string; invoices: number; billed: number; discount: number }[];
  billedTotal: number;
  invoicesCount: number;
  appointments: Record<string, number>;
  visits: number;
  newPatients: number;
}

interface VisitsReport {
  from: string;
  to: string;
  truncated: boolean;
  rows: {
    visitId: string;
    visitNo: string;
    date: string;
    token: number | null;
    status: 'open' | 'completed';
    patient: { _id: string; name: string; mrn: string; gender?: string; age?: number; phone?: string } | null;
    doctor: string;
    complaint: string;
    diagnosis: string;
    invoiceNo: string;
    billed: number;
    paid: number;
    due: number;
  }[];
  summary: {
    visits: number;
    uniquePatients: number;
    newPatients: number;
    billed: number;
    paid: number;
    due: number;
    byDoctor: { doctor: string; visits: number; billed: number; paid: number }[];
  };
}

interface Summary {
  from: string;
  to: string;
  income: { date: string; total: number }[];
  totalIncome: number;
  outstanding: number;
  outstandingCount: number;
  topDiagnoses: { diagnosis: string; count: number }[];
  visits: number;
  newPatients: number;
}

@Component({
  selector: 'app-reports',
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="no-print d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <h3 class="mb-0">Reports</h3>
      <ul class="nav nav-pills">
        <li class="nav-item"><button class="nav-link" [class.active]="tab() === 'visits'" (click)="tab.set('visits')">Patients report</button></li>
        <li class="nav-item"><button class="nav-link" [class.active]="tab() === 'daily'" (click)="tab.set('daily')">Daily cash report</button></li>
        <li class="nav-item"><button class="nav-link" [class.active]="tab() === 'summary'" (click)="tab.set('summary')">Summary</button></li>
      </ul>
    </div>
    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    @if (tab() === 'daily') {
      <div class="no-print card border-0 shadow-sm mb-3">
        <div class="card-body py-2 d-flex gap-3 align-items-end">
          <div><label class="form-label small mb-0">Date</label><input type="date" class="form-control form-control-sm" [ngModel]="date" (ngModelChange)="date = $event; loadDaily()" /></div>
          <button class="btn btn-sm btn-outline-secondary" (click)="date = todayStr; loadDaily()">Today</button>
          @if (auth.has('reports.export')) { <button class="btn btn-sm btn-primary ms-auto" (click)="print()"><i class="bi bi-printer me-1"></i>Print</button> }
        </div>
      </div>

      @if (daily(); as d) {
        <div class="print-sheet">
          <div class="mb-3">
            <div class="fs-4 fw-bold" style="color:#0f4c4c">{{ auth.me()?.clinic?.name }}</div>
            <div class="text-muted">Daily cash report · {{ d.date }}</div>
            <div class="small text-muted">Money received and billed on this day (from Billing). For the list of patients seen, open the Patients report.</div>
          </div>
          <div class="row g-3 mb-3">
            <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">Received</div><div class="value">{{ d.received | number: '1.0-0' }}</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">Refunded</div><div class="value text-danger">{{ d.refunded | number: '1.0-0' }}</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">Net collection</div><div class="value">{{ d.net | number: '1.0-0' }}</div></div></div></div>
            <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">Billed today</div><div class="value">{{ d.billedTotal | number: '1.0-0' }}</div></div></div></div>
          </div>

          <div class="row g-3">
            <div class="col-md-6">
              <div class="fw-semibold mb-1">Net by payment method</div>
              <table class="table table-sm">
                <tbody>
                  @for (m of methodRows(d); track m[0]) { <tr><td class="text-capitalize">{{ m[0] }}</td><td class="text-end">{{ m[1] | number: '1.0-2' }}</td></tr> }
                  @empty { <tr><td class="text-muted">No payments</td></tr> }
                </tbody>
              </table>
            </div>
            <div class="col-md-6">
              <div class="fw-semibold mb-1">Collected by doctor</div>
              <table class="table table-sm">
                <tbody>
                  @for (c of d.collectedByDoctor; track c.doctor) { <tr><td>{{ c.doctor }}</td><td class="text-end">{{ c.collected | number: '1.0-2' }}</td></tr> }
                  @empty { <tr><td class="text-muted">No payments</td></tr> }
                </tbody>
              </table>
            </div>
            <div class="col-12">
              <div class="fw-semibold mb-1">Billing by doctor ({{ d.invoicesCount }} invoices)</div>
              <table class="table table-sm">
                <thead class="table-light"><tr><th>Doctor</th><th class="text-end">Invoices</th><th class="text-end">Discount</th><th class="text-end">Billed</th></tr></thead>
                <tbody>
                  @for (b of d.billedByDoctor; track b.doctor) { <tr><td>{{ b.doctor }}</td><td class="text-end">{{ b.invoices }}</td><td class="text-end">{{ b.discount | number: '1.0-2' }}</td><td class="text-end">{{ b.billed | number: '1.0-2' }}</td></tr> }
                  @empty { <tr><td colspan="4" class="text-muted">No invoices</td></tr> }
                </tbody>
              </table>
            </div>
            <div class="col-12">
              <div class="fw-semibold mb-1">Activity</div>
              <div class="small">
                New patients: <strong>{{ d.newPatients }}</strong> · Visits: <strong>{{ d.visits }}</strong>
                @for (s of apptRows(d); track s[0]) { · <span class="text-capitalize">{{ s[0] }}</span>: <strong>{{ s[1] }}</strong> }
              </div>
            </div>
          </div>
        </div>
      }
    }

    @if (tab() === 'summary') {
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-2 d-flex gap-3 align-items-end flex-wrap">
          <div><label class="form-label small mb-0">From</label><input type="date" class="form-control form-control-sm" [ngModel]="from" (ngModelChange)="from = $event; loadSummary()" /></div>
          <div><label class="form-label small mb-0">To</label><input type="date" class="form-control form-control-sm" [ngModel]="to" (ngModelChange)="to = $event; loadSummary()" /></div>
        </div>
      </div>

      @if (summary(); as s) {
        <div class="row g-3 mb-3">
          <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">Income (net)</div><div class="value">{{ s.totalIncome | number: '1.0-0' }}</div></div></div></div>
          <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">Outstanding dues</div><div class="value text-danger">{{ s.outstanding | number: '1.0-0' }}</div><div class="small text-muted">{{ s.outstandingCount }} invoice(s)</div></div></div></div>
          <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">Visits</div><div class="value">{{ s.visits }}</div></div></div></div>
          <div class="col-6 col-md-3"><div class="card stat-card"><div class="card-body"><div class="label">New patients</div><div class="value">{{ s.newPatients }}</div></div></div></div>
        </div>
        <div class="row g-3">
          <div class="col-lg-7">
            <div class="card border-0 shadow-sm"><div class="card-header bg-white fw-semibold">Income per day</div>
              <div class="card-body">
                @for (d of s.income; track d.date) {
                  <div class="d-flex align-items-center mb-1 small">
                    <div style="width:90px">{{ d.date }}</div>
                    <div class="flex-grow-1 bg-light rounded"><div class="rounded" style="background:#14b8a6; height:14px" [style.width.%]="pct(d.total, s)"></div></div>
                    <div class="text-end" style="width:90px">{{ d.total | number: '1.0-0' }}</div>
                  </div>
                } @empty { <div class="text-muted">No income in this period</div> }
              </div>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="card border-0 shadow-sm"><div class="card-header bg-white fw-semibold">Top diagnoses</div>
              <ul class="list-group list-group-flush">
                @for (t of s.topDiagnoses; track t.diagnosis) { <li class="list-group-item d-flex justify-content-between text-capitalize">{{ t.diagnosis }}<span class="badge bg-secondary">{{ t.count }}</span></li> }
                @empty { <li class="list-group-item text-muted">No diagnoses recorded</li> }
              </ul>
            </div>
          </div>
        </div>
      }
    }

    @if (tab() === 'visits') {
      <div class="no-print card border-0 shadow-sm mb-3">
        <div class="card-body py-2 d-flex gap-3 align-items-end flex-wrap">
          <div><label class="form-label small mb-0">From</label><input type="date" class="form-control form-control-sm" [ngModel]="vFrom" (ngModelChange)="vFrom = $event; loadVisits()" /></div>
          <div><label class="form-label small mb-0">To</label><input type="date" class="form-control form-control-sm" [ngModel]="vTo" (ngModelChange)="vTo = $event; loadVisits()" /></div>
          <div>
            <label class="form-label small mb-0">Doctor</label>
            <select class="form-select form-select-sm" [ngModel]="vDoctor" (ngModelChange)="vDoctor = $event; loadVisits()">
              <option value="">All doctors</option>
              @for (d of doctors(); track d._id) { <option [value]="d._id">{{ d.name }}</option> }
            </select>
          </div>
          <div>
            <label class="form-label small mb-0">Status</label>
            <select class="form-select form-select-sm" [ngModel]="vStatus" (ngModelChange)="vStatus = $event; loadVisits()">
              <option value="">All</option><option value="completed">Completed</option><option value="open">Not finished</option>
            </select>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" (click)="quick(0)">Today</button>
            <button class="btn btn-outline-secondary" (click)="quick(-6)">Last 7 days</button>
            <button class="btn btn-outline-secondary" (click)="quick(-29)">Last 30 days</button>
          </div>
          <div class="ms-auto d-flex gap-2">
            @if (auth.has('reports.export')) {
              <button class="btn btn-sm btn-outline-primary" [disabled]="!vr()?.rows?.length" (click)="downloadCsv()"><i class="bi bi-filetype-csv me-1"></i>Excel (CSV)</button>
              <button class="btn btn-sm btn-primary" (click)="print()"><i class="bi bi-printer me-1"></i>Print</button>
            }
          </div>
        </div>
      </div>

      @if (vr(); as r) {
        <div class="print-sheet" style="max-width: none">
          <div class="mb-3">
            <div class="fs-4 fw-bold" style="color:#0f4c4c">{{ auth.me()?.clinic?.name }}</div>
            <div class="text-muted">Patients report · {{ r.from === r.to ? r.from : r.from + ' to ' + r.to }}{{ doctorName() ? ' · ' + doctorName() : '' }}</div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-6 col-md-2"><div class="card stat-card"><div class="card-body"><div class="label">Checkups</div><div class="value">{{ r.summary.visits }}</div></div></div></div>
            <div class="col-6 col-md-2"><div class="card stat-card"><div class="card-body"><div class="label">Patients</div><div class="value">{{ r.summary.uniquePatients }}</div></div></div></div>
            <div class="col-6 col-md-2"><div class="card stat-card"><div class="card-body"><div class="label">New patients</div><div class="value">{{ r.summary.newPatients }}</div></div></div></div>
            <div class="col-6 col-md-2"><div class="card stat-card"><div class="card-body"><div class="label">Billed</div><div class="value">{{ r.summary.billed | number: '1.0-0' }}</div></div></div></div>
            <div class="col-6 col-md-2"><div class="card stat-card"><div class="card-body"><div class="label">Received</div><div class="value">{{ r.summary.paid | number: '1.0-0' }}</div></div></div></div>
            <div class="col-6 col-md-2"><div class="card stat-card"><div class="card-body"><div class="label">Due</div><div class="value text-danger">{{ r.summary.due | number: '1.0-0' }}</div></div></div></div>
          </div>

          @if (r.summary.byDoctor.length > 1) {
            <div class="fw-semibold mb-1">By doctor</div>
            <table class="table table-sm mb-3" style="max-width: 520px">
              <thead class="table-light"><tr><th>Doctor</th><th class="text-end">Checkups</th><th class="text-end">Billed</th><th class="text-end">Received</th></tr></thead>
              <tbody>
                @for (d of r.summary.byDoctor; track d.doctor) {
                  <tr><td>{{ d.doctor }}</td><td class="text-end">{{ d.visits }}</td><td class="text-end">{{ d.billed | number: '1.0-0' }}</td><td class="text-end">{{ d.paid | number: '1.0-0' }}</td></tr>
                }
              </tbody>
            </table>
          }

          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle">
              <thead class="table-light">
                <tr><th>#</th><th>Date</th><th>Token</th><th>Patient</th><th>Age / Sex</th><th>Doctor</th><th>Complaint</th><th>Diagnosis</th><th>Status</th><th class="text-end">Billed</th><th class="text-end">Paid</th><th class="text-end">Due</th></tr>
              </thead>
              <tbody>
                @for (v of r.rows; track v.visitId; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td class="text-nowrap">{{ v.date }}</td>
                    <td>{{ v.token ? '#' + v.token : '' }}</td>
                    <td><span class="fw-semibold">{{ v.patient?.name }}</span><div class="small text-muted">{{ v.patient?.mrn }}{{ v.patient?.phone ? ' · ' + v.patient?.phone : '' }}</div></td>
                    <td class="text-capitalize text-nowrap">{{ v.patient?.age ?? '' }} {{ v.patient?.gender }}</td>
                    <td>{{ v.doctor }}</td>
                    <td>{{ v.complaint }}</td>
                    <td>{{ v.diagnosis }}</td>
                    <td><span class="badge" [class.bg-success]="v.status === 'completed'" [class.bg-info]="v.status === 'open'" [class.text-dark]="v.status === 'open'">{{ v.status === 'open' ? 'not finished' : v.status }}</span></td>
                    <td class="text-end">{{ v.billed | number: '1.0-0' }}</td>
                    <td class="text-end">{{ v.paid | number: '1.0-0' }}</td>
                    <td class="text-end" [class.text-danger]="v.due > 0">{{ v.due | number: '1.0-0' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="12" class="text-center text-muted py-4">@if (loading.busy()) { <span class="spinner-border spinner-border-sm me-2"></span>Loading report… } @else { No checkups in this period }</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (r.truncated) { <div class="small text-warning">Only the first 1000 checkups are shown. Narrow the dates.</div> }
        </div>
      }
    }
  `,
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);
  loading = inject(LoadingService);
  auth = inject(AuthService);

  tab = signal<'visits' | 'daily' | 'summary'>('visits');
  daily = signal<Daily | null>(null);
  summary = signal<Summary | null>(null);
  vr = signal<VisitsReport | null>(null);
  doctors = signal<Doctor[]>([]);
  error = signal('');

  todayStr = today();
  date = today();
  from = today(-29);
  to = today();
  vFrom = today();
  vTo = today();
  vDoctor = '';
  vStatus = '';

  ngOnInit() {
    this.loadVisits();
    this.loadDaily();
    this.loadSummary();
    this.http.get<Doctor[]>(`${API}/users/doctors`).subscribe((d) => this.doctors.set(d));
  }

  doctorName = () => this.doctors().find((d) => d._id === this.vDoctor)?.name ?? '';

  quick(daysBack: number) {
    this.vFrom = today(daysBack);
    this.vTo = today();
    this.loadVisits();
  }

  loadVisits() {
    const params: Record<string, string> = { from: this.vFrom, to: this.vTo };
    if (this.vDoctor) params['doctorId'] = this.vDoctor;
    if (this.vStatus) params['status'] = this.vStatus;
    this.http.get<VisitsReport>(`${API}/reports/visits`, { params }).subscribe({
      next: (r) => {
        this.vr.set(r);
        this.error.set('');
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  /** Downloads the table as a CSV file that opens in Excel. */
  downloadCsv() {
    const r = this.vr();
    if (!r) return;
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Date', 'Token', 'Visit', 'Patient ID', 'Patient', 'Age', 'Gender', 'Phone', 'Doctor', 'Complaint', 'Diagnosis', 'Status', 'Invoice', 'Billed', 'Paid', 'Due'];
    const lines = [head.map(cell).join(',')];
    for (const v of r.rows) {
      lines.push([v.date, v.token ?? '', v.visitNo, v.patient?.mrn, v.patient?.name, v.patient?.age, v.patient?.gender, v.patient?.phone, v.doctor, v.complaint, v.diagnosis, v.status, v.invoiceNo, v.billed, v.paid, v.due].map(cell).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `patients-report-${r.from}${r.from === r.to ? '' : '-to-' + r.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  loadDaily() {
    this.http.get<Daily>(`${API}/reports/daily`, { params: { date: this.date } }).subscribe({
      next: (d) => {
        this.daily.set(d);
        this.error.set('');
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  loadSummary() {
    this.http.get<Summary>(`${API}/reports/summary`, { params: { from: this.from, to: this.to } }).subscribe({
      next: (s) => this.summary.set(s),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  methodRows = (d: Daily) => Object.entries(d.byMethod);
  apptRows = (d: Daily) => Object.entries(d.appointments);
  pct = (v: number, s: Summary) => {
    const max = Math.max(...s.income.map((i) => i.total), 1);
    return Math.max((v / max) * 100, 2);
  };

  print() {
    window.print();
  }
}
