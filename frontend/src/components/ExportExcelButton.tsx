import { FileSpreadsheet } from 'lucide-react';

interface Props {
  href: string;
  label?: string;
}

export default function ExportExcelButton({ href, label = 'Exportar Excel' }: Props) {
  const handleDownload = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(href, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = label + '.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar el archivo Excel');
    }
  };

  return (
    <button onClick={handleDownload} className="btn btn-success btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <FileSpreadsheet size={16} />
      {label}
    </button>
  );
}
