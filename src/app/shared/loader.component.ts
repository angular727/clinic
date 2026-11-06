import { Component, input } from '@angular/core';

/** Skeleton placeholder for a page or card that is still loading. Usage: <app-loader /> (text is read by screen readers). */
@Component({
  selector: 'app-loader',
  template: `
    <div class="placeholder-glow" role="status" [attr.aria-label]="text()">
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <span class="placeholder col-4 rounded mb-3" style="height: 1.6rem"></span><br />
          <span class="placeholder col-9 rounded mb-2"></span><br />
          <span class="placeholder col-7 rounded mb-2"></span><br />
          <span class="placeholder col-8 rounded"></span>
        </div>
      </div>
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <span class="placeholder col-12 rounded mb-2" style="height: 1.1rem"></span><br />
          <span class="placeholder col-12 rounded mb-2" style="height: 1.1rem"></span><br />
          <span class="placeholder col-12 rounded" style="height: 1.1rem"></span>
        </div>
      </div>
    </div>
  `,
})
export class LoaderComponent {
  text = input('Loading…');
}
