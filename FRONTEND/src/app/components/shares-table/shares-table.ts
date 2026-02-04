import { Component, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IPortfolioItem } from '../../interfaces/portfolio.interface';

@Component({
  selector: 'app-shares-table',
  imports: [DecimalPipe],
  templateUrl: './shares-table.html',
  styleUrl: './shares-table.scss',
})
export class SharesTable {
  data = input.required<IPortfolioItem[]>();
}
