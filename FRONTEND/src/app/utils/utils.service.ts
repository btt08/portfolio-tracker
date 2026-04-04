import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  formatNumber(value: number): string {
    const formatted = value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return value >= 0 ? `+${formatted}` : formatted;
  }
}
