import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ICurrency } from 'app/interfaces/currency.interface';

@Injectable({
  providedIn: 'root',
})
export class CurrencyRestService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/currency`;

  getCurrencies(): Observable<ICurrency[]> {
    return this.http
      .get<ICurrency[]>(`${this.baseUrl}/all`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    return throwError(
      () => new Error('Something went wrong with the API. Please try again later.')
    );
  }
}
