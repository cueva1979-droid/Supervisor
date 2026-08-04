export interface ItemData {
  id?: number;
  record_id?: number;
  codigo_cpc: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
  requires_review: boolean;
}

export interface RecordData {
  id?: number;
  filename?: string;
  file_type?: string;
  proveedor?: string;
  ruc?: string;
  codigo_proceso?: string;
  numero_orden?: string;
  fecha?: string;
  objeto_contratacion?: string;
  monto_total: number;
  moneda?: string;
  estado?: string;
  observaciones?: string;
  fecha_procesamiento?: string;
  provider_id?: number;
  items: ItemData[];
}

export interface ProviderData {
  id?: number;
  nombre: string;
  ruc: string;
  contratos?: number;
  codigo_proceso?: string;
  telefono?: string;
  observaciones?: string;
  fecha_creacion?: string;
  records?: RecordData[];
}

export interface DashboardData {
  total_documentos: number;
  total_proveedores: number;
  total_ordenes: number;
  total_montos: number;
  ultimos_registros: RecordData[];
  ordenes_por_mes: Record<string, number>;
  montos_por_proveedor: Record<string, number>;
}

export interface UploadResult {
  filename: string;
  status: 'success' | 'error';
  record?: RecordData;
  error?: string;
}

export interface ProviderReportItem {
  id: number;
  nombre: string;
  ruc: string;
  ordenes: string;
  objeto: string;
  total_infimas: number;
}

export interface ProviderReportStats {
  total_proveedores: number;
  total_infimas: number;
  top_proveedor: string;
  top_cantidad: number;
}

export interface ProviderReportResponse {
  items: ProviderReportItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  stats: ProviderReportStats;
}

export interface ProductReportItem {
  codigo_cpc: string;
  descripcion: string;
  precio_min: number;
  precio_max: number;
  precio_promedio: number;
  compras: number;
  total_adquirido: number;
  proveedores: string;
}

export interface ProductReportStats {
  total_productos: number;
  total_compras: number;
  producto_mas_comprado: string;
  producto_precio_mas_alto: string;
  producto_precio_mas_bajo: string;
  valor_total_acumulado: number;
}

export interface ChartData {
  label: string;
  value: number;
}

export interface ProductReportCharts {
  chart_top_products: ChartData[];
  chart_price_evolution: ChartData[];
  chart_provider_purchases: ChartData[];
}

export interface ProductoItem {
  id: number;
  codigo_cpc: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  v_unitario: number;
  v_total: number;
  numero_orden: string;
  proveedor: string;
}

export interface ProductosResponse {
  items: ProductoItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ProductReportResponse {
  items: ProductReportItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  stats: ProductReportStats;
  charts: ProductReportCharts;
}
