# Factufacil — interfaz (React)

Prototipo funcional de Factufacil: facturación, inventario y cierres de caja para una tienda de barrio, pensado para personas con poca experiencia en computadores.

## Cómo correrlo

Requisitos: Node.js 18 o superior.

```powershell
npm install
npm run dev
```

Abre http://localhost:5173. Para publicar (por ejemplo en Netlify): `npm run build` y sube la carpeta `dist`.

## Con servidor o sin servidor

- **Con servidor (por defecto en desarrollo):** el archivo `.env.development` tiene `VITE_API_URL=http://localhost:8080/api`. Primero se arranca `factufacil-backend` (`.\mvnw.cmd spring-boot:run`) y luego `npm run dev`. Todo se guarda en la base de datos; la contraseña de los usuarios de prueba es `1234`. La sesión usa JWT y se renueva sola con el refresh token.
- **Sin servidor:** `npm run dev:offline` (o `VITE_API_URL` vacía): la interfaz funciona sola con datos de prueba guardados en el navegador (sirve como respaldo para la demostración). Para la versión publicada se define `VITE_API_URL` con la dirección del servidor antes de `npm run build`.

## Usuarios de prueba (sin servidor: cualquier contraseña · con servidor: 1234)

| Cédula | Nombre | Cargo |
|---|---|---|
| 1000000001 | Carlos Ruiz | DESARROLLADOR |
| 1000000002 | Ana Jefe | JEFE |
| 1000000003 | Pedro Admin | ADMIN |
| 1000000004 | Maria Empleada | EMPLEADO |
| 1000000005 | Luisa Empleada | EMPLEADO |

## Qué incluye

- Ingreso con cédula y menú por cargo (botones grandes, atajos con números).
- **Facturar**: varias facturas abiertas en pestañas, cliente opcional, autocompletado con ↑ ↓ + Enter, flujo completo con Enter (cliente → cantidad → producto → valor → … → efectivo → transferencia → entrega → guardar), IVA configurable, validación de pagos, sección aparte de entrega y devuelta, impresión A5. F2 abre otra factura, F9 guarda.
- **Ver facturas** (admin, jefe, desarrollador): filtros, detalle, modificar o anular con motivo obligatorio e historial.
- **Productos**: categorías con autocompletado, aviso de agotados (no lo ven los empleados), Excel, pedido en Excel e inventario físico (descargar plantilla, subir el Excel contado y aplicar diferencias).
- **Clientes** (validación de documento y nombre duplicados), **Empleados** (nadie cambia su propio cargo), **Novedades**.
- **Cerrar caja**: turno de mañana y tarde (uno por fecha y turno), sobrante y faltante calculados contra las ventas del sistema, cierre del día.
- **Entidades** abiertas (Gana, Coordinadora y las que se creen), % de ganancia automático y tipo de pago para Coordinadora.
- **Ajustes de inventario**: llegó mercancía, producto nuevo, daño y consumo interno.
- **Cierres diarios**: por día, semana, mes y todos los meses, ajuste manual con motivo y entregas de caja.
- **Estadísticas**, **Resumen para WhatsApp**, **Datos del negocio** (logo, nombre, IVA) y **Registro de auditoría**.

Nada se borra: los registros se desactivan y las facturas se anulan. Cada acción importante queda en la auditoría.

## Notas técnicas

- `src/remoto.js` es el cliente de la API (token, renovación, errores en español) y expone los mismos métodos que el store local de `src/store.jsx`; las pantallas no saben cuál de los dos están usando.
- Sin servidor, los datos viven en el navegador (localStorage) y en *Mi negocio* hay un botón para restablecerlos.
- Estilos propios en `src/styles.css` (sin Tailwind); íconos con lucide-react; Excel con SheetJS (`xlsx`).
- La regla "cantidad mayor a 1" se implementó como **cantidad mínima 1**, para poder vender una sola unidad.
- La devuelta se calcula como *entrega − efectivo*; en pagos 100 % en efectivo es igual a *entrega − total*.
