package co.edu.itm.factufacil.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "secuencias")
@Getter @Setter @NoArgsConstructor
public class Secuencia {
    @Id
    private String nombre;
    private long valor;

    public Secuencia(String nombre, long valor) { this.nombre = nombre; this.valor = valor; }
}
