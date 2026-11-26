package co.edu.itm.factufacil.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ajustes_inventario")
@Getter @Setter @NoArgsConstructor
public class AjusteInventario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long productoId;
    private String tipo;
    private int cantidad;
    private String motivo;
    private Long empleadoId;
    private LocalDateTime fecha = LocalDateTime.now();
}
