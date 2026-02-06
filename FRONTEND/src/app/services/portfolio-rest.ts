import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IResponse } from '../interfaces/portfolio.interface';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PortfolioRestService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/portfolio';

  getportfolio(): Observable<IResponse> {
    return this.http.get<IResponse>(this.baseUrl);
  }

  refreshPortfolio(): Observable<IResponse> {
    const refreshUrl = `${this.baseUrl}/refresh`;
    return this.http.get<IResponse>(refreshUrl, {});
  }
}
