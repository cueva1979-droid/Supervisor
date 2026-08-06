import { API_BASE } from './config';

export const CSRF_COOKIE_NAME = 'sp_csrf';

export interface UserInfo {
  id: number;
  username: string;
  role: string;
  email: string;
}

export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  csrf_token?: string;
  token_type: string;
  user: UserInfo;
}

export function getCsrfToken(): string {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de conexión' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function refreshToken(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('No se pudo renovar la sesión');
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // ignorar errores de red al cerrar sesión
  }
}

export async function getMe(): Promise<UserInfo> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Sesión no válida');
  return res.json();
}

export function isAuthenticated(): boolean {
  return !!getUser();
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

export function clearUser() {
  localStorage.removeItem('user');
}