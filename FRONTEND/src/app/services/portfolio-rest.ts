import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IRawPortfolioItem } from '../interfaces/portfolio.interface';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PortfolioRestService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/portfolio';

  getportfolio(): Observable<any> {
    return this.http.get<any>(this.baseUrl);
  }

  refreshPortfolio(): Observable<any> {
    const refreshUrl = `${this.baseUrl}/refresh`;
    return this.http.get<any>(refreshUrl, {});
  }
}
