# Factufacil

Facturación, inventario y cierres de caja para una tienda de barrio, pensado para personas con poca experiencia en computadores: botones grandes, pocos textos y todo se puede hacer con el teclado.

Proyecto integrador del curso Gestión de Proyectos — Ingeniería de Sistemas, Institución Universitaria ITM. Equipo 15.

| Parte | Tecnología | Carpeta |
|---|---|---|
| Interfaz | React 18 + Vite, estilos propios, lucide-react, SheetJS | [`factufacil-frontend`](factufacil-frontend) |
| Servidor | Java 21, Spring Boot 3.3, Spring Security + JWT, Spring Data JPA | [`factufacil-backend`](factufacil-backend) |
| Base de datos | MySQL 8 / MariaDB (H2 en modo MySQL para la demostración) | [`factufacil-backend/database`](factufacil-backend/database) |

## Correr el proyecto completo

Requisitos: Java 21 y Node.js 18 o superior. No hace falta instalar Maven ni una base de datos.

```powershell
# 1. Servidor (http://localhost:8080) — carga datos de prueba
cd factufacil-backend
.\mvnw.cmd spring-boot:run

# 2. Interfaz (http://localhost:5173), en otra terminal
cd factufacil-frontend
npm install
npm run dev
```

Usuarios de prueba (contraseña `1234`): `1000000001` desarrollador, `1000000002` jefe, `1000000003` administrador, `1000000004` y `1000000005` empleadas.

Sin servidor, la interfaz también funciona sola con datos en el navegador: `npm run dev:offline`.

## Módulos

Ingreso por cédula y menú por cargo · Facturar (varias facturas a la vez, flujo con Enter, impresión A5) · Revisión de facturas (modificar o anular con motivo) · Productos, pedidos e inventario físico en Excel · Clientes · Empleados · Novedades · Cierre de turno y de día · Entidades (Gana, Coordinadora…) · Ajustes de inventario · Cierres diarios (día, semana, mes, acumulado y entregas de caja) · Estadísticas · Resumen para WhatsApp · Datos del negocio · Registro de auditoría.

Nada se borra: los registros se desactivan y las facturas se anulan. Toda acción importante queda en la auditoría.

## Pruebas

Con el servidor en marcha: `python factufacil-backend/pruebas/prueba_api.py` (31 casos de funcionamiento y reglas del negocio).

## Alcance

Las facturas son documentos de **control interno** y no reemplazan la factura electrónica de la DIAN. No incluye pagos en línea, aplicación móvil propia ni conexión con impresoras térmicas o lectores de código.
