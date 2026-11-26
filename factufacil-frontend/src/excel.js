import * as XLSX from 'xlsx';

// filas: arreglo de objetos { 'Columna': valor }. anchos opcional en caracteres.
export function descargarExcel(nombreArchivo, nombreHoja, filas, anchos) {
  const ws = XLSX.utils.json_to_sheet(filas);
  if (anchos) ws['!cols'] = anchos.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));
  XLSX.writeFile(wb, nombreArchivo);
}

export async function leerExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}
