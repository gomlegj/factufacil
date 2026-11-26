-- =====================================================================
-- Factufacil - Esquema de base de datos (MySQL 8 / MariaDB 10.6+)
-- Reglas: nada se borra fisicamente (activo / ANULADA), todo lo
-- importante queda en log_auditoria. Montos en DECIMAL(12,2).
-- El mismo script lo usa H2 en modo MySQL para la demostracion.
-- =====================================================================

-- 1. Empresa y configuracion ------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_config (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  direccion       VARCHAR(250),
  celular         VARCHAR(20),
  logo            MEDIUMTEXT,                       -- imagen en base64 (data URL)
  porcentaje_iva  DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  actualizado_en  DATETIME
);

-- Secuencias atomicas (numero de factura sin repetir con varias facturas abiertas)
CREATE TABLE IF NOT EXISTS secuencias (
  nombre  VARCHAR(30) PRIMARY KEY,
  valor   BIGINT NOT NULL DEFAULT 0
);

-- 2. Seguridad y empleados ---------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(30) NOT NULL UNIQUE               -- DESARROLLADOR, JEFE, ADMIN, EMPLEADO
);

CREATE TABLE IF NOT EXISTS empleados (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  cedula          VARCHAR(20)  NOT NULL UNIQUE,     -- se usa para iniciar sesion
  nombre          VARCHAR(150) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,            -- bcrypt
  rol_id          BIGINT NOT NULL,
  creado_por_id   BIGINT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME,
  CONSTRAINT fk_emp_rol FOREIGN KEY (rol_id) REFERENCES roles(id),
  CONSTRAINT fk_emp_creador FOREIGN KEY (creado_por_id) REFERENCES empleados(id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  empleado_id  BIGINT NOT NULL,
  token_hash   VARCHAR(64) NOT NULL UNIQUE,         -- SHA-256 del refresh token
  expira_en    DATETIME NOT NULL,
  revocado     BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_emp FOREIGN KEY (empleado_id) REFERENCES empleados(id)
);

-- 3. Productos ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL UNIQUE,
  activo  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS productos (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL UNIQUE,     -- indice para el autocompletado
  valor_unidad    DECIMAL(12,2) NOT NULL,           -- sin IVA
  cantidad        INT NOT NULL DEFAULT 0,           -- existencias actuales
  categoria_id    BIGINT NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME,
  CONSTRAINT fk_prod_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  CONSTRAINT ck_prod_valor CHECK (valor_unidad > 0)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  creado_por_id  BIGINT NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ped_emp FOREIGN KEY (creado_por_id) REFERENCES empleados(id),
  CONSTRAINT ck_ped_estado CHECK (estado IN ('PENDIENTE','COMPLETADO'))
);

CREATE TABLE IF NOT EXISTS pedido_detalle (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  pedido_id           BIGINT NOT NULL,
  producto_id         BIGINT NOT NULL,
  cantidad_necesaria  INT NOT NULL,
  CONSTRAINT fk_pd_ped FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  CONSTRAINT fk_pd_prod FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- 4. Clientes ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  documento       VARCHAR(20)  NOT NULL UNIQUE,     -- cedula o NIT, admite letras
  nombre          VARCHAR(150) NOT NULL UNIQUE,     -- duplicados se validan por nombre y documento
  correo          VARCHAR(150),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME
);

-- 5. Facturacion -------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  numero_factura   VARCHAR(20) NOT NULL UNIQUE,     -- FAC-0001, desde secuencias
  fecha            DATETIME NOT NULL,
  cliente_id       BIGINT NULL,                     -- opcional
  empleado_id      BIGINT NOT NULL,                 -- quien la hizo
  subtotal         DECIMAL(12,2) NOT NULL,          -- sin IVA
  valor_iva        DECIMAL(12,2) NOT NULL,
  total            DECIMAL(12,2) NOT NULL,          -- con IVA
  valor_entregado  DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_devuelto   DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado           VARCHAR(10) NOT NULL DEFAULT 'ACTIVA',
  creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME,
  INDEX idx_fac_fecha (fecha),
  CONSTRAINT fk_fac_cli FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_fac_emp FOREIGN KEY (empleado_id) REFERENCES empleados(id),
  CONSTRAINT ck_fac_estado CHECK (estado IN ('ACTIVA','ANULADA'))
);

CREATE TABLE IF NOT EXISTS factura_detalle (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  factura_id       BIGINT NOT NULL,
  producto_id      BIGINT NOT NULL,
  nombre_producto  VARCHAR(150) NOT NULL,           -- copia historica del nombre
  cantidad         INT NOT NULL,
  valor_unidad     DECIMAL(12,2) NOT NULL,
  valor_total      DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_fd_fac FOREIGN KEY (factura_id) REFERENCES facturas(id),
  CONSTRAINT fk_fd_prod FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT ck_fd_cant CHECK (cantidad >= 1)
);

CREATE TABLE IF NOT EXISTS factura_pagos (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  factura_id  BIGINT NOT NULL,
  medio_pago  VARCHAR(15) NOT NULL,
  valor       DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_fp_fac FOREIGN KEY (factura_id) REFERENCES facturas(id),
  CONSTRAINT ck_fp_medio CHECK (medio_pago IN ('EFECTIVO','TRANSFERENCIA'))
);

-- Historial de cada factura: creacion, modificaciones y anulacion con motivo
CREATE TABLE IF NOT EXISTS factura_historial (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  factura_id     BIGINT NOT NULL,
  accion         VARCHAR(15) NOT NULL,
  motivo         VARCHAR(300),
  empleado_id    BIGINT NOT NULL,
  total_antes    DECIMAL(12,2),
  total_despues  DECIMAL(12,2),
  fecha          DATETIME NOT NULL,
  CONSTRAINT fk_fh_fac FOREIGN KEY (factura_id) REFERENCES facturas(id),
  CONSTRAINT fk_fh_emp FOREIGN KEY (empleado_id) REFERENCES empleados(id),
  CONSTRAINT ck_fh_accion CHECK (accion IN ('CREAR','MODIFICAR','ANULAR'))
);

-- 6. Novedades ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS novedades (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha        DATE NOT NULL,
  descripcion  VARCHAR(500) NOT NULL,
  valor        DECIMAL(12,2) NOT NULL DEFAULT 0,
  empleado_id  BIGINT NOT NULL,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nov_emp FOREIGN KEY (empleado_id) REFERENCES empleados(id)
);

-- 7. Cierres de turno y de dia -----------------------------------------
CREATE TABLE IF NOT EXISTS cierres_turno (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha                DATE NOT NULL,
  turno                VARCHAR(10) NOT NULL,
  empleado_entrega_id  BIGINT NOT NULL,
  empleado_recibe_id   BIGINT NOT NULL,
  ventas_sistema       DECIMAL(12,2) NOT NULL,      -- lo que dicen las facturas del turno
  valor_efectivo       DECIMAL(12,2) NOT NULL,
  valor_transferencia  DECIMAL(12,2) NOT NULL,
  valor_total          DECIMAL(12,2) NOT NULL,      -- efectivo + transferencia
  gastos               DECIMAL(12,2) NOT NULL DEFAULT 0,
  sobra                DECIMAL(12,2) NOT NULL DEFAULT 0,
  falta                DECIMAL(12,2) NOT NULL DEFAULT 0,
  coordinadora_valor   DECIMAL(12,2) NOT NULL DEFAULT 0,
  gana_valor           DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones        VARCHAR(500),
  creado_en            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_cierre_turno UNIQUE (fecha, turno),
  CONSTRAINT fk_ct_entrega FOREIGN KEY (empleado_entrega_id) REFERENCES empleados(id),
  CONSTRAINT fk_ct_recibe FOREIGN KEY (empleado_recibe_id) REFERENCES empleados(id),
  CONSTRAINT ck_ct_turno CHECK (turno IN ('MAÑANA','TARDE'))
);

CREATE TABLE IF NOT EXISTS cierres_dia (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha                DATE NOT NULL UNIQUE,        -- un cierre por dia
  total_vendido        DECIMAL(12,2) NOT NULL,
  total_efectivo       DECIMAL(12,2) NOT NULL,
  total_transferencia  DECIMAL(12,2) NOT NULL,
  gastos               DECIMAL(12,2) NOT NULL DEFAULT 0,
  sobra                DECIMAL(12,2) NOT NULL DEFAULT 0,
  falta                DECIMAL(12,2) NOT NULL DEFAULT 0,
  ajuste_manual        DECIMAL(12,2) NOT NULL DEFAULT 0,   -- poner o quitar plata
  motivo_ajuste        VARCHAR(600),                        -- obligatorio si hay ajuste
  cerrado_por_id       BIGINT NOT NULL,
  creado_en            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cd_emp FOREIGN KEY (cerrado_por_id) REFERENCES empleados(id)
);

CREATE TABLE IF NOT EXISTS entregas_caja (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha_desde       DATE NOT NULL,
  fecha_hasta       DATE NOT NULL,
  valor_entregado   DECIMAL(12,2) NOT NULL,
  entregado_por_id  BIGINT NOT NULL,
  recibido_por_id   BIGINT NOT NULL,
  observaciones     VARCHAR(300),
  creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ec_entrega FOREIGN KEY (entregado_por_id) REFERENCES empleados(id),
  CONSTRAINT fk_ec_recibe FOREIGN KEY (recibido_por_id) REFERENCES empleados(id)
);

-- 8. Entidades (Gana, Coordinadora y las que se agreguen) ---------------
CREATE TABLE IF NOT EXISTS entidades (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(100) NOT NULL UNIQUE,
  requiere_tipo_pago  BOOLEAN NOT NULL DEFAULT FALSE,   -- Coordinadora: establecimiento / contra entrega
  activo              BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS entidad_conciliaciones (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  entidad_id           BIGINT NOT NULL,
  fecha                DATE NOT NULL,
  tipo_pago            VARCHAR(20) NULL,
  valor_entregado      DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_ganancia       DECIMAL(12,2) NOT NULL DEFAULT 0,
  porcentaje_ganancia  DECIMAL(5,2) NOT NULL DEFAULT 0,  -- ganancia / (entregado + ganancia) * 100
  empleado_id          BIGINT NOT NULL,
  creado_en            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conc_ent FOREIGN KEY (entidad_id) REFERENCES entidades(id),
  CONSTRAINT fk_conc_emp FOREIGN KEY (empleado_id) REFERENCES empleados(id),
  CONSTRAINT ck_conc_tipo CHECK (tipo_pago IS NULL OR tipo_pago IN ('ESTABLECIMIENTO','CONTRAENTREGA'))
);

-- 9. Ajustes de inventario ---------------------------------------------
CREATE TABLE IF NOT EXISTS ajustes_inventario (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  producto_id  BIGINT NOT NULL,
  tipo         VARCHAR(20) NOT NULL,
  cantidad     INT NOT NULL,                        -- en CONTEO_FISICO es la diferencia (+/-)
  motivo       VARCHAR(300) NOT NULL,
  empleado_id  BIGINT NOT NULL,
  fecha        DATETIME NOT NULL,
  CONSTRAINT fk_aj_prod FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_aj_emp FOREIGN KEY (empleado_id) REFERENCES empleados(id),
  CONSTRAINT ck_aj_tipo CHECK (tipo IN ('INGRESO_NUEVO','INGRESO_EXISTENTE','DANO','CONSUMO_INTERNO','CONTEO_FISICO'))
);

-- 10. Auditoria (quien hizo que y cuando) --------------------------------
CREATE TABLE IF NOT EXISTS log_auditoria (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tabla_afectada  VARCHAR(50) NOT NULL,
  registro_id     BIGINT NULL,
  accion          VARCHAR(20) NOT NULL,             -- CREAR, EDITAR, DESACTIVAR, REACTIVAR, ANULAR, CERRAR, AJUSTAR, INGRESAR
  empleado_id     BIGINT NULL,
  detalle         TEXT,
  fecha           DATETIME NOT NULL,
  INDEX idx_aud_fecha (fecha),
  CONSTRAINT fk_aud_emp FOREIGN KEY (empleado_id) REFERENCES empleados(id)
);
