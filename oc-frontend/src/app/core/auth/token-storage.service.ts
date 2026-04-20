import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  get accessToken(): string | null {
    return localStorage.getItem(environment.auth.accessTokenKey);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(environment.auth.refreshTokenKey);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(environment.auth.accessTokenKey, accessToken);
    localStorage.setItem(environment.auth.refreshTokenKey, refreshToken);
  }

  clear(): void {
    localStorage.removeItem(environment.auth.accessTokenKey);
    localStorage.removeItem(environment.auth.refreshTokenKey);
  }
}
