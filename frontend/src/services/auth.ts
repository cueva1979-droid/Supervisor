import { API_BASE } from './config';

export interface UserInfo {
  id: number;
  username: string;
  role: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserInfo;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de conexión' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function refreshToken(token: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: token }),
  });
  if (!res.ok) throw new Error('No se pudo renovar el token');
  return res.json();
}

export async function getMe(token: string): Promise<UserInfo> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Sesión no válida');
  return res.json();
}

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function getUser(): UserInfo | null {
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setUser(user: UserInfo) {
  localStorage.setItem('user', JSON.stringify(user));
}
