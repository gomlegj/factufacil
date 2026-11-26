package co.edu.itm.factufacil.web;

/** Expresiones de @PreAuthorize según la tabla de roles y accesos del documento de requisitos. */
final class Roles {
    private Roles() {}

    /** Administrador, jefe y desarrollador: revisión de facturas, ajustes, consolidados, inventario físico. */
    static final String GESTION = "hasAnyRole('DESARROLLADOR','JEFE','ADMIN')";
    /** Jefe y desarrollador: empleados, datos del negocio, estadísticas y auditoría. */
    static final String DIRECCION = "hasAnyRole('DESARROLLADOR','JEFE')";
}
