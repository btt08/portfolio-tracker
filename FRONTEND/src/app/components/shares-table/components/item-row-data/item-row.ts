import { Component, input, model } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IPortfolioItem } from 'app/interfaces/portfolio.interface';
import { Toggle } from 'app/components/buttons/toggle/toggle';

@Component({
  selector: '[app-item-row]',
  imports: [DecimalPipe, Toggle],
  templateUrl: './item-row.html',
  styleUrls: ['./item-row.scss'],
})
export class ItemRow {
  item = input.required<IPortfolioItem>();
  expandedItems = model.required<Set<string>>();

  toggleExpand(isin: string): void {
    const current = new Set(this.expandedItems());
    if (current.has(isin)) {
      current.delete(isin);
    } else {
      current.add(isin);
    }
    this.expandedItems.set(current);
  }

  isExpanded(isin: string): boolean {
    return this.expandedItems().has(isin);
  }
}
