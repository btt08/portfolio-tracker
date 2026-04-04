import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IPortfolioItem } from '@interfaces/portfolio.interface';
import { PortfolioRestService } from '@services/portfolio-rest';

@Injectable({
  providedIn: 'root',
})
export class FileUtilsService {
  private portfolioService = inject(PortfolioRestService);

  exportCsv(items: IPortfolioItem[]): void {
    const headers = [
      'ISIN',
      'Name',
      'Type',
      'Shares',
      'Invested',
      'Market Value',
      'Avg Price',
      'Current Price',
      'Daily Change EUR',
      'Daily Change %',
      'Total Change EUR',
      'Total Change %',
      'Realized PnL',
      'Unrealized PnL',
    ];
    const rows = items.map(i =>
      [
        i.isin,
        `"${i.name}"`,
        i.type,
        i.numShares,
        i.totalInvested,
        i.marketValue,
        i.avgPrice,
        i.currPrice,
        i.dailyChangeEUR,
        i.dailyChangePerc,
        i.totalChangeEUR,
        i.totalChangePerc,
        i.realizedPnl,
        i.unrealizedPnl,
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportJson(): void {
    this.portfolioService.exportPortfolio().subscribe({
      next: raw => {
        const blob = new Blob([JSON.stringify(raw, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: error => {
        console.error('Error exporting portfolio:', error);
      },
    });
  }

  importJson(): Observable<any> {
    return new Observable(observer => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          observer.error(new Error('No file selected'));
          input.remove();
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result as string);
            if (!Array.isArray(data)) {
              observer.error(
                new Error('Invalid file: expected a JSON array of portfolio items.')
              );
              input.remove();
              return;
            }
            this.portfolioService.importPortfolio(data).subscribe({
              next: res => {
                observer.next(res);
                observer.complete();
                input.remove();
              },
              error: err => {
                observer.error(err);
                input.remove();
              },
            });
          } catch (err) {
            observer.error(err);
            input.remove();
          }
        };
        reader.onerror = err => {
          observer.error(err);
          input.remove();
        };
        reader.readAsText(file);
      };
      input.click();

      return () => {
        input.remove();
      };
    });
  }
}
