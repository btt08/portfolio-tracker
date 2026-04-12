import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ILot, IResponse } from '@interfaces/portfolio.interface';
import { ITransferFormModel } from '@interfaces/transfer-form.interface';

@Injectable({
  providedIn: 'root',
})
export class PortfolioRestService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/portfolio`;

  getportfolio(): Observable<IResponse> {
    return this.http.get<IResponse>(this.baseUrl).pipe(catchError(this.handleError));
  }

  refreshPortfolio(): Observable<IResponse> {
    return this.http
      .get<IResponse>(`${this.baseUrl}/refresh`)
      .pipe(catchError(this.handleError));
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

  transferFunds(sourceIsin: string, transfer: ITransferFormModel): Observable<IResponse> {
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

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    return throwError(
      () => new Error('Something went wrong with the API. Please try again later.')
    );
  }
}
