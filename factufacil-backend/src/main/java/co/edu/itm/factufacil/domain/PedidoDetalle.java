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
@Table(name = "pedido_detalle")
@Getter @Setter @NoArgsConstructor
public class PedidoDetalle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "pedido_id")
    private Pedido pedido;
    private Long productoId;
    private int cantidadNecesaria;
}
