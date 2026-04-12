import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  imports: [],
  template: `<span class="toggle" [class.expanded]="!hiddenStatus()" (click)="toggle()">
    ▶
  </span>`,
  styleUrls: ['./toggle.scss'],
})
export class Toggle {
  hiddenStatus = input.required<boolean>();
  onToggle = output<void>();

  toggle() {
    this.onToggle.emit();
  }
}
