import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IResponse } from '../interfaces/portfolio.interface';

@Injectable({
  providedIn: 'root',
})
export class PortfolioRestService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/portfolio';

  getportfolio(): Observable<IResponse> {
    return this.http.get<IResponse>(this.baseUrl).pipe(catchError(this.handleError));
  }

  refreshPortfolio(): Observable<IResponse> {
    const refreshUrl = `${this.baseUrl}/refresh`;
    return this.http.get<IResponse>(refreshUrl).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    return throwError(
      () => new Error('Something went wrong with the API. Please try again later.')
    );
  }
}
