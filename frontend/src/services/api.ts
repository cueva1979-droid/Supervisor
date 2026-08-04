import { API_BASE } from './config';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options?.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de conexión' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function uploadFiles(files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form, headers });
  if (res.status === 401) { localStorage.removeItem('access_token'); window.location.href = '/login'; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al subir archivos' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function getRecords(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<any[]>(`/records${params}`);
}

export async function getRecord(id: number) {
  return request<any>(`/records/${id}`);
}

export async function updateRecord(id: number, data: any) {
  return request<any>(`/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(id: number) {
  return request<any>(`/records/${id}`, { method: 'DELETE' });
}

export async function getProviders(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<any[]>(`/providers${params}`);
}

export async function getProvider(id: number) {
  return request<any>(`/providers/${id}`);
}

export async function createProvider(data: any) {
  return request<any>('/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProvider(id: number, data: any) {
  return request<any>(`/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProvider(id: number) {
  return request<any>(`/providers/${id}`, { method: 'DELETE' });
}

export async function getDashboard() {
  return request<any>('/dashboard');
}

export async function getAdministradores(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<any[]>(`/administradores${params}`);
}

export async function getProductos(params?: { search?: string; page?: number; per_page?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  const q = qs.toString();
  return request<any>(`/productos${q ? '?' + q : ''}`);
}

export async function getUsers() {
  return request<any[]>('/admin/users');
}

export async function createUser(data: { username: string; password: string; email?: string; role: string }) {
  return request<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id: number, data: { username?: string; email?: string; password?: string; role?: string; is_active?: boolean }) {
  return request<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteUser(id: number) {
  return request<any>(`/admin/users/${id}`, { method: 'DELETE' });
}

export async function getProcesosAdministradores(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<any[]>(`/procesos/administradores${params}`);
}

export async function exportProcesosExcelByAdmin(adminName: string): Promise<void> {
  const url = `${API_BASE}/procesos/export-excel-by-admin?admin_name=${encodeURIComponent(adminName)}`;
  const headers = getAuthHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al exportar' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `CAM_${adminName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export function getExportExcelUrl() {
  return `${API_BASE}/export/excel`;
}
