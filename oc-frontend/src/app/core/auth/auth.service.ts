import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { OrderSummaryDraftService } from '../services/order-summary-draft.service';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

interface MessageResponse {
  message: string;
}

interface JwtClaims {
  [key: string]: unknown;
}

interface UserIdentity {
  displayName: string;
  role: string;
  roleKey: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly orderSummaryDraftService = inject(OrderSummaryDraftService);

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.api.baseUrl}${environment.api.endpoints.login}`, {
        username,
        password
      })
      .pipe(
        tap((response) =>
          this.tokenStorage.setTokens(response.accessToken, response.refreshToken)
        )
      );
  }

  setPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${environment.api.baseUrl}${environment.api.endpoints.setPassword}`,
      { token, newPassword }
    );
  }

  resendActivation(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${environment.api.baseUrl}${environment.api.endpoints.resendActivation}`,
      { email }
    );
  }

  logout(): void {
    const refreshToken = this.tokenStorage.refreshToken;

    if (refreshToken) {
      this.http
        .post<void>(`${environment.api.baseUrl}${environment.api.endpoints.logout}`, { refreshToken })
        .subscribe({ error: () => this.clearSession() });
    }

    this.clearSession();
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.accessToken;
  }

  getAccessToken(): string | null {
    return this.tokenStorage.accessToken;
  }

  clearSession(): void {
    this.orderSummaryDraftService.clear();
    this.tokenStorage.clear();
    this.router.navigate(['/login']);
  }

  getUserDisplayName(): string {
    return this.getUserIdentity().displayName;
  }

  getUserRole(): string {
    return this.getUserIdentity().role;
  }

  getUserRoleKey(): string | null {
    return this.getUserIdentity().roleKey;
  }

  isProviderUser(): boolean {
    return this.getUserRoleKey() === 'PROVEEDOR';
  }

  getDefaultPortalRoute(): string {
    return this.isProviderUser() ? '/portal/proveedor' : '/portal';
  }

  getUserInitials(): string {
    const parts = this.getUserDisplayName()
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0)
      .slice(0, 2);

    if (!parts.length) {
      return 'OC';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  private getUserIdentity(): UserIdentity {
    const claims = this.getTokenClaims();

    if (!claims) {
      return {
        displayName: 'Usuario',
        role: 'Sin rol',
        roleKey: null
      };
    }

    const displayName = this.resolveDisplayName(claims) ?? 'Usuario';
    const roleKey = this.resolveRoleKey(claims);
    const role = roleKey ? this.formatRole(roleKey) : 'Sin rol';

    return {
      displayName,
      role,
      roleKey
    };
  }

  private getTokenClaims(): JwtClaims | null {
    const token = this.tokenStorage.accessToken;

    if (!token) {
      return null;
    }

    const tokenParts = token.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    const payload = tokenParts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

    try {
      const decoded = window.atob(padded);
      return JSON.parse(decoded) as JwtClaims;
    } catch {
      return null;
    }
  }

  private resolveDisplayName(claims: JwtClaims): string | null {
    const firstName = this.pickStringClaim(claims, ['given_name', 'firstName', 'nombre']);
    const lastName = this.pickStringClaim(claims, ['family_name', 'lastName', 'apellido']);

    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    return this.pickStringClaim(claims, [
      'name',
      'preferred_username',
      'unique_name',
      'username',
      'user',
      'email',
      'sub'
    ]);
  }

  private resolveRoleKey(claims: JwtClaims): string | null {
    const directRole = this.normalizeRoleValue(claims['role']);
    if (directRole) {
      return this.normalizeRoleKey(directRole);
    }

    const commonRoles = this.normalizeRoleValue(claims['roles'] ?? claims['authorities']);
    if (commonRoles) {
      return this.normalizeRoleKey(commonRoles);
    }

    const realmAccess = claims['realm_access'];
    if (this.isRecord(realmAccess)) {
      const realmRoles = this.normalizeRoleValue(realmAccess['roles']);
      if (realmRoles) {
        return this.normalizeRoleKey(realmRoles);
      }
    }

    const resourceAccess = claims['resource_access'];
    if (this.isRecord(resourceAccess)) {
      for (const resource of Object.values(resourceAccess)) {
        if (this.isRecord(resource)) {
          const resourceRole = this.normalizeRoleValue(resource['roles']);
          if (resourceRole) {
            return this.normalizeRoleKey(resourceRole);
          }
        }
      }
    }

    return null;
  }

  private normalizeRoleValue(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) {
        return null;
      }

      if (trimmed.includes(',') || trimmed.includes(';')) {
        const parts = trimmed
          .split(/[;,]+/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0);

        return parts[0] ?? null;
      }

      return trimmed;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = this.normalizeRoleValue(item);
        if (parsed) {
          return parsed;
        }
      }
    }

    if (this.isRecord(value)) {
      return this.normalizeRoleValue(value['role'] ?? value['authority'] ?? value['name']);
    }

    return null;
  }

  private pickStringClaim(claims: JwtClaims, keys: string[]): string | null {
    for (const key of keys) {
      const value = claims[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private formatRole(rawRole: string): string {
    const withoutPrefix = rawRole.replace(/^ROLE_/i, '');

    return withoutPrefix
      .split(/[_\-\s]+/)
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private normalizeRoleKey(rawRole: string): string {
    return rawRole.replace(/^ROLE_/i, '').trim().toUpperCase();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
