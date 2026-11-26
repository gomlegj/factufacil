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
@Table(name = "factura_historial")
@Getter @Setter @NoArgsConstructor
public class FacturaHistorial {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "factura_id")
    private Factura factura;
    private String accion;
    private String motivo;
    private Long empleadoId;
    private BigDecimal totalAntes;
    private BigDecimal totalDespues;
    private LocalDateTime fecha = LocalDateTime.now();
}
