import { getAccessToken } from './auth';
import { API_BASE } from './config';

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (token) return { 'Authorization': `Bearer ${token}` };
  return {};
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de conexión' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export const pacAPI = {
  getDocuments: () => request<any[]>('/pac/documents'),
  getDocument: (id: string) => request<any>(`/pac/documents/${id}`),
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API_BASE}/pac/documents`, { method: 'POST', body: form, headers: getAuthHeaders() }).then(r => r.json());
  },
  updateDocument: (id: string, data: any) => request<any>(`/pac/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteDocument: (id: string) => request<any>(`/pac/documents/${id}`, { method: 'DELETE' }),
  deleteAllDocuments: () => request<any>('/pac/documents', { method: 'DELETE' }),
  cleanDuplicates: () => request<any>('/pac/documents/clean-duplicates', { method: 'POST' }),

  getPeriodAnalysis: () => request<any[]>('/pac/analysis/periods'),

  getCertificates: () => request<any[]>('/pac/certificates'),
  createCertificate: (data: any) => request<any>('/pac/certificates', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteAllCertificates: () => request<any>('/pac/certificates/all', { method: 'DELETE' }),
  generateCertUrl: (id: string) => `${API_BASE}/pac/certificates/generate/${id}`,
  generateCustomCert: (data: any) =>
    fetch(`${API_BASE}/pac/certificates/generate-custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: 'Error' }));
        throw err;
      }
      return r.blob();
    }),
  downloadTemplateUrl: () => `${API_BASE}/pac/template/download`,

  getCPCCatalog: () => request<any[]>('/pac/cpc/catalog'),
  bulkSaveCPC: (items: any[]) => request<any>('/pac/cpc/bulk', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }),
  deleteCPC: (cpc: string) => request<any>(`/pac/cpc/catalog/${encodeURIComponent(cpc)}`, { method: 'DELETE' }),
  deleteAllCPC: () => request<any>('/pac/cpc/catalog-all', { method: 'DELETE' }),

  getCPCLoaded: () => request<any[]>('/pac/cpc/loaded'),
  saveCPCLoaded: (items: any[]) => request<any>('/pac/cpc/loaded', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }),
  deleteCPCLoaded: (cpc: string) => request<any>(`/pac/cpc/loaded/${encodeURIComponent(cpc)}`, { method: 'DELETE' }),
  clearCPCLoaded: () => request<any>('/pac/cpc/loaded', { method: 'DELETE' }),
};
