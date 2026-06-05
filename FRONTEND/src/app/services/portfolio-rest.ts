import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  ILot,
  IPortfolio,
  IPortfolioItem,
  IResponse,
} from '@interfaces/portfolio.interface';
import { ITransferData } from 'app/interfaces/transfer.interface';

@Injectable({
  providedIn: 'root',
})
export class PortfolioRestService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/portfolio`;

  getPortfolio(): Observable<IPortfolio> {
    return this.http.get<IResponse>(this.baseUrl).pipe(
      map(response => {
        return this.filterEmptyItems(response.data);
      }),
      catchError(this.handleError)
    );
  }

  refreshPortfolio(): Observable<IPortfolio> {
    return this.http.get<IResponse>(`${this.baseUrl}/refresh`).pipe(
      map(response => {
        return this.filterEmptyItems(response.data);
      }),
      catchError(this.handleError)
    );
  }

  addPortfolioItem(item: {
    isin: string;
    name: string;
    type: string;
    link: string;
    lots?: ILot[];
  }): Observable<IResponse> {
    return this.http
      .post<IResponse>(`${this.baseUrl}/add`, item)
      .pipe(catchError(this.handleError));
  }

  addLot(isin: string, lot: ILot): Observable<IResponse> {
    return this.http
      .post<IResponse>(`${this.baseUrl}/${isin}/add`, lot)
      .pipe(catchError(this.handleError));
  }

  sellShares(
    isin: string,
    sell: { qtyToSell: number; sellPrice: number; commission: number }
  ): Observable<IResponse> {
    return this.http
      .post<IResponse>(`${this.baseUrl}/${isin}/sell`, sell)
      .pipe(catchError(this.handleError));
  }

  transferFunds(sourceIsin: string, transfer: ITransferData): Observable<IResponse> {
    return this.http
      .post<IResponse>(`${this.baseUrl}/${sourceIsin}/transfer`, transfer)
      .pipe(catchError(this.handleError));
  }

  deleteItem(isin: string): Observable<IResponse> {
    return this.http
      .delete<IResponse>(`${this.baseUrl}/${isin}`)
      .pipe(catchError(this.handleError));
  }

  deleteLot(isin: string, lotId: string): Observable<IResponse> {
    return this.http
      .delete<IResponse>(`${this.baseUrl}/${isin}/${lotId}`)
      .pipe(catchError(this.handleError));
  }

  exportPortfolio(): Observable<unknown[]> {
    return this.http
      .get<unknown[]>(`${this.baseUrl}/export`)
      .pipe(catchError(this.handleError));
  }

  importPortfolio(data: unknown[]): Observable<IResponse> {
    return this.http
      .post<IResponse>(`${this.baseUrl}/import`, data)
      .pipe(catchError(this.handleError));
  }

  reorderPortfolio(isins: string[]): Observable<IResponse> {
    return this.http
      .post<IResponse>(`${this.baseUrl}/reorder`, { isins })
      .pipe(catchError(this.handleError));
  }

  private filterEmptyItems(portfolio: IPortfolio): IPortfolio {
    const filteredItems = portfolio.items.filter(item => item.numShares > 0);
    return { ...portfolio, items: filteredItems };
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    return throwError(
      () => new Error('Something went wrong with the API. Please try again later.')
    );
  }
}
