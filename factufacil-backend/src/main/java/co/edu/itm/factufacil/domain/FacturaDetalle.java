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
@Table(name = "factura_detalle")
@Getter @Setter @NoArgsConstructor
public class FacturaDetalle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "factura_id")
    private Factura factura;
    private Long productoId;
    private String nombreProducto;
    private int cantidad;
    private BigDecimal valorUnidad;
    private BigDecimal valorTotal;
}
