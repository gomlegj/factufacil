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
@Table(name = "facturas")
@Getter @Setter @NoArgsConstructor
public class Factura {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "numero_factura")
    private String numero;
    private LocalDateTime fecha;
    private Long clienteId;
    private Long empleadoId;
    private BigDecimal subtotal;
    @Column(name = "valor_iva")
    private BigDecimal iva;
    private BigDecimal total;
    @Column(name = "valor_entregado")
    private BigDecimal entregado;
    @Column(name = "valor_devuelto")
    private BigDecimal devuelto;
    private String estado = "ACTIVA";
    private LocalDateTime creadoEn = LocalDateTime.now();
    private LocalDateTime actualizadoEn;
    @OneToMany(mappedBy = "factura", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<FacturaDetalle> items = new ArrayList<>();
    @OneToMany(mappedBy = "factura", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<FacturaPago> pagos = new ArrayList<>();
    @OneToMany(mappedBy = "factura", cascade = CascadeType.ALL)
    @OrderBy("id")
    private List<FacturaHistorial> historial = new ArrayList<>();
}
