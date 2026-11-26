import {
  Receipt, Package, Users, UserCog, FileSearch, StickyNote, Wallet, Building2,
  PackagePlus, CalendarRange, BarChart3, MessageCircle, Settings, ShieldCheck,
} from 'lucide-react';

export const ROLES = ['DESARROLLADOR', 'JEFE', 'ADMIN', 'EMPLEADO'];
const TODOS = ROLES;
const GESTION = ['DESARROLLADOR', 'JEFE', 'ADMIN'];
const DIRECCION = ['DESARROLLADOR', 'JEFE'];

// Cada módulo: color propio, ícono y roles que lo ven.
export const MODULOS = [
  { id: 'facturar', titulo: 'Facturar', desc: 'Vender', icono: Receipt, color: '#2f7d5b', roles: TODOS },
  { id: 'productos', titulo: 'Productos', desc: 'Inventario y pedidos', icono: Package, color: '#3b6b8c', roles: TODOS },
  { id: 'clientes', titulo: 'Clientes', desc: 'Personas y empresas', icono: Users, color: '#7a5c9e', roles: TODOS },
  { id: 'novedades', titulo: 'Novedades', desc: 'Gastos y apuntes', icono: StickyNote, color: '#b7791f', roles: TODOS },
  { id: 'cierres', titulo: 'Cerrar caja', desc: 'Turno y día', icono: Wallet, color: '#c05621', roles: TODOS },
  { id: 'entidades', titulo: 'Entidades', desc: 'Gana, Coordinadora…', icono: Building2, color: '#2c7a7b', roles: TODOS },
  { id: 'ajustes', titulo: 'Ajustes', desc: 'Entradas y salidas', icono: PackagePlus, color: '#4a6fa5', roles: GESTION },
  { id: 'facturas', titulo: 'Ver facturas', desc: 'Modificar o anular', icono: FileSearch, color: '#9b2c2c', roles: GESTION },
  { id: 'consolidado', titulo: 'Cierres diarios', desc: 'Día, semana, mes', icono: CalendarRange, color: '#6b5b3e', roles: GESTION },
  { id: 'whatsapp', titulo: 'Resumen', desc: 'Para WhatsApp', icono: MessageCircle, color: '#25855a', roles: GESTION },
  { id: 'analitica', titulo: 'Estadísticas', desc: '¿Qué se vende?', icono: BarChart3, color: '#805ad5', roles: DIRECCION },
  { id: 'empleados', titulo: 'Empleados', desc: 'Personas y cargos', icono: UserCog, color: '#2b6cb0', roles: DIRECCION },
  { id: 'empresa', titulo: 'Mi negocio', desc: 'Nombre, logo, IVA', icono: Settings, color: '#4a5568', roles: DIRECCION },
  { id: 'auditoria', titulo: 'Registro', desc: 'Quién hizo qué', icono: ShieldCheck, color: '#718096', roles: DIRECCION },
];

export const puede = (rol, moduloId) => !!MODULOS.find((m) => m.id === moduloId)?.roles.includes(rol);
export const veAgotados = (rol) => GESTION.includes(rol);
export const gestionaEmpleados = (rol) => DIRECCION.includes(rol);
