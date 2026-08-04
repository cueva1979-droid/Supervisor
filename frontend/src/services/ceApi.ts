import { getAccessToken } from './auth';

const API_BASE = 'http://127.0.0.1:8000';

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (token) return { 'Authorization': `Bearer ${token}` };
  return {};
}

export interface CEItem {
  cpc: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  v_unitario: number;
  subtotal: number;
  partida_presupuestaria: string;
}

export interface CEExtraction {
  id: string;
  orden_compra: string;
  fecha_aceptacion: string;
  nombre_comercial: string;
  razon_social: string;
  ruc: string;
  administrador: string;
  objeto_contratacion: string;
  items: CEItem[];
  v_total: number;
  estado: string;
  filename: string;
  fecha_procesamiento: string;
}

export async function ceUploadFile(file: File): Promise<CEExtraction> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/ce/upload`, { method: 'POST', body: form, headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al procesar PDF' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function ceListExtractions(): Promise<CEExtraction[]> {
  const res = await fetch(`${API_BASE}/ce/extractions`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al listar extracciones');
  return res.json();
}

export async function ceGetExtraction(id: string): Promise<CEExtraction> {
  const res = await fetch(`${API_BASE}/ce/extractions/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Extracción no encontrada');
  return res.json();
}

export async function ceUpdateExtraction(id: string, data: Partial<Pick<CEExtraction, 'nombre_comercial' | 'razon_social' | 'administrador' | 'estado'>>): Promise<CEExtraction> {
  const res = await fetch(`${API_BASE}/ce/extractions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al actualizar' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function ceDeleteExtraction(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ce/extractions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al eliminar');
}

export async function ceClearExtractions(): Promise<void> {
  await fetch(`${API_BASE}/ce/extractions`, { method: 'DELETE', headers: getAuthHeaders() });
}

export function ceGetExportExcelUrl(ids?: string[]): string {
  const params = ids && ids.length > 0 ? `?ids=${ids.join(',')}` : '';
  return `${API_BASE}/ce/export-excel${params}`;
}

export async function ceExportExcelByIds(ids?: string[]): Promise<void> {
  const url = ceGetExportExcelUrl(ids);
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al exportar' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = ids && ids.length === 1 ? `CE_${ids[0].slice(0, 8)}.xlsx` : `CE_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export async function ceExportExcelByAdmin(adminName: string): Promise<void> {
  const url = `${API_BASE}/ce/export-excel-by-admin/${encodeURIComponent(adminName)}`;
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al exportar' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `CE_${adminName.replace(/\s+/g, '_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
