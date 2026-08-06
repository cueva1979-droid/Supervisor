import type { ProductReportResponse } from '../types';

export async function getProductReport(params: {
  search?: string;
  producto?: string;
  proveedor?: string;
  codigo_cpc?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  precio_min?: number;
  precio_max?: number;
  codigo_proceso?: string;
  page?: number;
  per_page?: number;
}): Promise<ProductReportResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.producto) qs.set('producto', params.producto);
  if (params.proveedor) qs.set('proveedor', params.proveedor);
  if (params.codigo_cpc) qs.set('codigo_cpc', params.codigo_cpc);
  if (params.fecha_desde) qs.set('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) qs.set('fecha_hasta', params.fecha_hasta);
  if (params.precio_min !== undefined) qs.set('precio_min', String(params.precio_min));
  if (params.precio_max !== undefined) qs.set('precio_max', String(params.precio_max));
  if (params.codigo_proceso) qs.set('codigo_proceso', params.codigo_proceso);
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  const res = await fetch(`/reports/products?${qs}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error al obtener reporte');
  return res.json();
}

export function getProductExcelUrl(params: {
  search?: string;
  producto?: string;
  proveedor?: string;
  codigo_cpc?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  precio_min?: number;
  precio_max?: number;
  codigo_proceso?: string;
}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.producto) qs.set('producto', params.producto);
  if (params.proveedor) qs.set('proveedor', params.proveedor);
  if (params.codigo_cpc) qs.set('codigo_cpc', params.codigo_cpc);
  if (params.fecha_desde) qs.set('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) qs.set('fecha_hasta', params.fecha_hasta);
  if (params.precio_min !== undefined) qs.set('precio_min', String(params.precio_min));
  if (params.precio_max !== undefined) qs.set('precio_max', String(params.precio_max));
  if (params.codigo_proceso) qs.set('codigo_proceso', params.codigo_proceso);
  return `/reports/products/excel?${qs}`;
}
