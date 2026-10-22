import { HttpClient } from '@angular/common/http';
import { Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API } from '../core/api';
import { PatientRef } from '../core/models';

/** Type-ahead patient search. Usage: <app-patient-picker [(patient)]="selected" /> */
@Component({
  selector: 'app-patient-picker',
  imports: [FormsModule],
  template: `
    @if (patient(); as p) {
      <div class="d-flex align-items-center border rounded px-2 py-1 bg-light">
        <div class="flex-grow-1">
          <strong>{{ p.name }}</strong>
          <small class="text-muted ms-2">{{ p.mrn }}{{ p.phone ? ' · ' + p.phone : '' }}</small>
        </div>
        @if (!locked()) {
          <button type="button" class="btn btn-sm btn-link text-danger" (click)="patient.set(null)">Change</button>
        }
      </div>
    } @else {
      <div class="position-relative">
        <input class="form-control" [ngModel]="q" (ngModelChange)="onType($event)" [ngModelOptions]="{ standalone: true }"
               placeholder="Search patient by name, phone or ID…" autocomplete="off" />
        @if (results().length) {
          <div class="list-group position-absolute w-100 shadow" style="z-index: 1060; max-height: 260px; overflow: auto">
            @for (r of results(); track r._id) {
              <button type="button" class="list-group-item list-group-item-action" (click)="pick(r)">
                <strong>{{ r.name }}</strong>
                <small class="text-muted ms-2">{{ r.mrn }}{{ r.phone ? ' · ' + r.phone : '' }}</small>
              </button>
            }
          </div>
        } @else if (searched() && q.trim().length > 1) {
          <div class="small text-muted mt-1">No patients found</div>
        }
      </div>
    }
  `,
})
export class PatientPickerComponent {
  private http = inject(HttpClient);

  patient = model<PatientRef | null>(null);
  locked = model(false);
  results = signal<PatientRef[]>([]);
  searched = signal(false);
  q = '';
  private timer: any;

  onType(v: string) {
    this.q = v;
    clearTimeout(this.timer);
    if (v.trim().length < 2) {
      this.results.set([]);
      this.searched.set(false);
      return;
    }
    this.timer = setTimeout(() => {
      this.http.get<{ items: PatientRef[] }>(`${API}/patients`, { params: { q: v.trim(), limit: 8 } }).subscribe((r) => {
        this.results.set(r.items);
        this.searched.set(true);
      });
    }, 250);
  }

  pick(p: PatientRef) {
    this.patient.set(p);
    this.results.set([]);
    this.q = '';
  }
}
