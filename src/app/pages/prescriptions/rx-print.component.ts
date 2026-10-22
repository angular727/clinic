import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API, errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { Prescription } from '../../core/models';
import { ageText } from '../../core/util';

/** A4 prescription with the clinic letterhead. Use the Print button (or Ctrl+P). */
@Component({
  selector: 'app-rx-print',
  imports: [RouterLink],
  template: `
    <div class="no-print d-flex justify-content-between align-items-center mb-3">
      <a [routerLink]="back()" class="text-decoration-none small"><i class="bi bi-arrow-left"></i> Back</a>
      @if (auth.has('prescriptions.print')) {
        <div class="d-flex gap-2">
          <button class="btn btn-outline-dark" (click)="print()"><i class="bi bi-printer me-1"></i>Print</button>
          <button class="btn btn-primary" [disabled]="busy()" (click)="downloadPdf()"><i class="bi bi-file-earmark-pdf me-1"></i>{{ busy() ? 'Creating PDF…' : 'PDF' }}</button>
        </div>
      }
    </div>
    @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }

    @if (rx(); as r) {
      <div class="print-sheet rx">
        <div class="text-center pb-2 mb-2 head">
          <div class="clinic-name">{{ clinic()?.name }}</div>
          @if (clinic()?.settings?.tagline) { <div class="text-muted small">{{ clinic()?.settings?.tagline }}</div> }
          <div class="small">{{ clinic()?.address }}{{ clinic()?.phone ? ' · Tel: ' + clinic()?.phone : '' }}</div>
        </div>

        <div class="d-flex justify-content-between mb-2">
          <div>
            <div class="fw-bold">{{ r.doctorId?.name }}</div>
            @if (r.doctorId?.qualification) { <div class="small">{{ r.doctorId.qualification }}</div> }
            @if (r.doctorId?.specialization) { <div class="small">{{ r.doctorId.specialization }}</div> }
            @if (r.doctorId?.registrationNo) { <div class="small text-muted">Reg. No: {{ r.doctorId.registrationNo }}</div> }
          </div>
          <div class="text-end small">
            <div>Rx No: <strong>{{ r.rxNo }}</strong></div>
            <div>Date: <strong>{{ r.date }}</strong></div>
          </div>
        </div>

        <div class="patient-box d-flex flex-wrap justify-content-between mb-2">
          <div><strong>{{ r.patientId?.name }}</strong></div>
          <div>ID: {{ r.patientId?.mrn }}</div>
          <div class="text-capitalize">{{ r.patientId?.gender }}{{ age(r.patientId) ? ' · ' + age(r.patientId) : '' }}</div>
          @if (r.patientId?.phone) { <div>{{ r.patientId.phone }}</div> }
        </div>
        @if (r.patientId?.allergies) { <div class="small text-danger mb-2"><strong>Allergies:</strong> {{ r.patientId.allergies }}</div> }

        @if (vitalsText()) { <div class="small mb-2"><strong>Vitals:</strong> {{ vitalsText() }}</div> }
        @if (r.visitId?.complaint) { <div class="small mb-1"><strong>Complaint:</strong> {{ r.visitId.complaint }}</div> }
        @if (r.visitId?.diagnosis) { <div class="small mb-2"><strong>Diagnosis:</strong> {{ r.visitId.diagnosis }}</div> }

        <div class="rx-symbol">℞</div>
        <table class="table table-sm table-borderless rx-table">
          <tbody>
            @for (i of r.items; track $index) {
              <tr>
                <td class="num">{{ $index + 1 }}.</td>
                <td>
                  <div class="fw-semibold">{{ i.medicine }}</div>
                  @if (i.instructions) { <div class="small text-muted">{{ i.instructions }}</div> }
                </td>
                <td>{{ i.dose }}</td>
                <td>{{ i.frequency }}</td>
                <td>{{ i.duration }}</td>
              </tr>
            } @empty {
              <tr><td class="text-muted">No medicines</td></tr>
            }
          </tbody>
        </table>

        @if (r.tests) { <div class="mb-2"><strong>Tests advised:</strong> {{ r.tests }}</div> }
        @if (r.advice) { <div class="mb-2"><strong>Advice:</strong> {{ r.advice }}</div> }
        @if (r.visitId?.followUpDate) { <div class="mb-2"><strong>Follow-up:</strong> {{ r.visitId.followUpDate }}</div> }

        <div class="d-flex justify-content-between align-items-end mt-5 pt-4">
          <div class="small text-muted">{{ clinic()?.settings?.printFooter }}</div>
          <div class="text-center sign"><div class="line"></div>Doctor's signature</div>
        </div>
      </div>
    }
  `,
  styles: `
    .clinic-name { font-size: 1.6rem; font-weight: 700; color: #0f4c4c; }
    .head { border-bottom: 2px solid #0f4c4c; }
    .patient-box { border: 1px solid #ccc; border-radius: 4px; padding: 6px 10px; font-size: .9rem; }
    .rx-symbol { font-size: 2rem; font-weight: 700; line-height: 1; margin: 8px 0 4px; }
    .rx-table td { padding: 4px 8px; }
    .rx-table .num { width: 28px; }
    .sign { min-width: 180px; font-size: .85rem; }
    .sign .line { border-top: 1px solid #000; margin-bottom: 2px; }
    .rx { min-height: 900px; }
  `,
})
export class RxPrintComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  rx = signal<Prescription | null>(null);
  error = signal('');
  busy = signal(false);

  age = ageText;
  clinic = () => this.auth.me()?.clinic;
  back = () => (this.rx() ? ['/opd', this.rx()!.visitId?._id ?? ''] : ['/patients']);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    // Opened from the consultation's Print / PDF buttons: do it straight away, then return to the visit.
    const auto = this.route.snapshot.queryParamMap.get('auto');
    this.http.get<Prescription>(`${API}/prescriptions/${id}`).subscribe({
      next: (r) => {
        this.rx.set(r);
        if (auto && this.auth.has('prescriptions.print')) {
          setTimeout(async () => {
            if (auto === 'pdf') await this.downloadPdf();
            else this.print();
            window.history.back();
          }, 500);
        }
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  /** Builds an A4 PDF of the prescription and downloads it (no print dialog needed). */
  async downloadPdf() {
    const r = this.rx();
    const sheet = document.querySelector('.print-sheet') as HTMLElement | null;
    if (!r || !sheet) return;
    this.busy.set(true);
    try {
      const mod: any = await import('html2pdf.js');
      const html2pdf = mod.default ?? mod;
      const patient = String(r.patientId?.name || 'patient').replace(/[^\w]+/g, '_');
      await html2pdf()
        .set({
          margin: 8,
          filename: `Prescription-${r.rxNo}-${patient}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(sheet)
        .save();
    } catch {
      this.error.set('Could not create the PDF. Use Print and choose "Save as PDF".');
    } finally {
      this.busy.set(false);
    }
  }

  vitalsText() {
    const v = this.rx()?.visitId?.vitals;
    if (!v) return '';
    const parts: string[] = [];
    if (v.bp) parts.push(`BP ${v.bp}`);
    if (v.pulse) parts.push(`Pulse ${v.pulse}`);
    if (v.temperature) parts.push(`Temp ${v.temperature}°F`);
    if (v.spo2) parts.push(`SpO₂ ${v.spo2}%`);
    if (v.weight) parts.push(`Wt ${v.weight} kg`);
    if (v.sugar) parts.push(`Sugar ${v.sugar}`);
    return parts.join(' · ');
  }

  print() {
    window.print();
  }
}
