# Factufacil — servidor (Spring Boot)

API REST de Factufacil: Java 21, Spring Boot 3.3, Spring Security con JWT (access token + refresh token rotativo), Spring Data JPA y MySQL/MariaDB.

## Cómo correrlo

Solo se necesita Java 21. Maven viene incluido con el wrapper (`mvnw`).

**Modo demostración (no hay que instalar base de datos).** Usa H2 en modo MySQL con el mismo script SQL y carga datos ficticios:

```powershell
.\mvnw.cmd spring-boot:run
```

El servidor queda en http://localhost:8080. Usuarios de prueba (contraseña `1234`):

| Cédula | Nombre | Cargo |
|---|---|---|
| 1000000001 | Carlos Ruiz | DESARROLLADOR |
| 1000000002 | Ana Jefe | JEFE |
| 1000000003 | Pedro Admin | ADMIN |
| 1000000004 | Maria Empleada | EMPLEADO |
| 1000000005 | Luisa Empleada | EMPLEADO |

Para empezar de cero se borra la carpeta `data/`.

**Con MySQL o MariaDB:**

1. `mysql -u root -p < database/factufacil.sql` (crea la base, el usuario `factufacil` y las tablas).
2. `.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=mysql`

Variables opcionales: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `DATOS_DEMO=true`, `FACTUFACIL_JWT_SECRET`, `FACTUFACIL_CORS`.

## Pruebas

Con el servidor en marcha (modo demostración):

```powershell
python pruebas/prueba_api.py
```

Son 31 casos de funcionamiento y de reglas del negocio: inicio de sesión, permisos por cargo, cálculo de IVA y devuelta, pagos que deben sumar el total, cantidad mínima, productos agotados, número consecutivo, modificar y anular con motivo, devolución al inventario, cargo propio, duplicados, cierres de turno únicos, % de ganancia, ajustes, refresh token de un solo uso y auditoría.

## Estructura

```
src/main/java/co/edu/itm/factufacil
├── config/   Seguridad, JWT, manejo de errores, datos iniciales
├── domain/   Entidades JPA (una por tabla)
├── repo/     Repositorios Spring Data
├── service/  Reglas del negocio (facturas, caja, inventario, catálogos, auditoría)
└── web/      Controladores REST y DTO
database/factufacil.sql          Script para MySQL/MariaDB (22 tablas)
src/main/resources/db/schema.sql Mismo esquema, usado por H2 en la demostración
```

## Endpoints principales

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` | Público |
| GET | `/api/estado` (todo lo que necesita la interfaz, según el cargo) | Con sesión |
| GET/PUT | `/api/empresa` | GET público · PUT jefe/desarrollador |
| GET/POST/PUT/PATCH | `/api/empleados` | Crear y editar: jefe/desarrollador |
| GET/POST/PUT/PATCH | `/api/productos`, `/api/clientes`, `/api/novedades`, `/api/entidades` | Con sesión |
| POST | `/api/pedidos` | Con sesión |
| POST | `/api/facturas` | Con sesión |
| GET · PUT · POST `/{id}/anular` | `/api/facturas` | Admin/jefe/desarrollador |
| GET/POST | `/api/cierres-turno`, `/api/cierres-dia` | Con sesión |
| PATCH | `/api/cierres-dia/{fecha}/ajuste` | Admin/jefe/desarrollador |
| GET/POST | `/api/entregas-caja` | Admin/jefe/desarrollador |
| GET/POST | `/api/entidades/conciliaciones` | Con sesión |
| POST | `/api/ajustes-inventario`, `/api/inventario-fisico` | Admin/jefe/desarrollador |
| GET | `/api/auditoria` | Jefe/desarrollador |

Los errores siempre responden `{"mensaje": "..."}` en español sencillo (400 regla del negocio, 401 sesión, 403 cargo, 404 no existe).

## Reglas que se validan en el servidor

- Nada se borra: empleados, productos, clientes, novedades y entidades se desactivan; las facturas se anulan.
- Toda acción importante queda en `log_auditoria` (quién, qué, cuándo) y cada factura tiene su historial con motivo.
- Número de factura consecutivo (`FAC-0001`) con bloqueo de fila (`SELECT … FOR UPDATE`): no se repite aunque se guarden varias a la vez.
- IVA configurable en `empresa_config` (19 % por defecto); efectivo y transferencia ≤ total y deben sumar el total.
- No se vende más de lo que hay; anular o modificar devuelve las unidades al inventario.
- Un cierre por fecha y turno; un cierre de día por fecha que suma los turnos; ajuste manual con motivo obligatorio.
- Contraseñas con bcrypt; refresh tokens guardados como hash SHA-256 y de un solo uso.
