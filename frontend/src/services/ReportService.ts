import type { ProviderReportResponse } from '../types';

export async function getProviderReport(params: {
  search?: string;
  orden_filtro?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  per_page?: number;
}): Promise<ProviderReportResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.orden_filtro) qs.set('orden_filtro', params.orden_filtro);
  if (params.fecha_desde) qs.set('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) qs.set('fecha_hasta', params.fecha_hasta);
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  const res = await fetch(`/reports/providers?${qs}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error al obtener reporte');
  return res.json();
}

export function getProviderExcelUrl(params: { search?: string; orden_filtro?: string }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.orden_filtro) qs.set('orden_filtro', params.orden_filtro);
  return `/reports/providers/excel?${qs}`;
}
