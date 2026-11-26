package co.edu.itm.factufacil.service;

import lombok.Getter;

/** Error de una regla del negocio. El mensaje se muestra tal cual a la persona. */
@Getter
public class NegocioException extends RuntimeException {
    private final int estado;

    public NegocioException(String mensaje) { this(400, mensaje); }

    public NegocioException(int estado, String mensaje) {
        super(mensaje);
        this.estado = estado;
    }

    public static NegocioException noExiste(String que) { return new NegocioException(404, "No encontramos " + que + "."); }
}
