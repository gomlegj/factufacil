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
@Table(name = "cierres_dia")
@Getter @Setter @NoArgsConstructor
public class CierreDia {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDate fecha;
    private BigDecimal totalVendido;
    private BigDecimal totalEfectivo;
    private BigDecimal totalTransferencia;
    private BigDecimal gastos;
    private BigDecimal sobra;
    private BigDecimal falta;
    private BigDecimal ajusteManual = BigDecimal.ZERO;
    private String motivoAjuste;
    private Long cerradoPorId;
    private LocalDateTime creadoEn = LocalDateTime.now();
}
