import { Component, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IGroupedPortfolioItem } from 'app/interfaces/portfolio.interface';
import { UtilsService } from 'app/utils/utils.service';
import { Toggle } from '@components/buttons/toggle/toggle';

@Component({
  selector: 'app-group-header',
  imports: [DecimalPipe, Toggle],
  templateUrl: './group-header.html',
  styleUrls: ['./group-header.scss'],
})
export class GroupHeader {
  private utils = inject(UtilsService);
  group = input.required<IGroupedPortfolioItem>();

  isPositive(value: number): boolean {
    return value > 0;
  }

  formatNumber(value: number): string {
    return this.utils.formatNumber(value);
  }
}
