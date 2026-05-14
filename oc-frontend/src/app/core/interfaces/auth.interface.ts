export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface MessageResponse {
  message: string;
}

export interface JwtClaims {
  [key: string]: unknown;
}

export interface UserIdentity {
  displayName: string;
  role: string;
  roleKey: string | null;
}