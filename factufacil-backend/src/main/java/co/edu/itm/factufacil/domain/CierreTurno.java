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
@Table(name = "cierres_turno")
@Getter @Setter @NoArgsConstructor
public class CierreTurno {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDate fecha;
    private String turno;
    private Long empleadoEntregaId;
    private Long empleadoRecibeId;
    private BigDecimal ventasSistema;
    private BigDecimal valorEfectivo;
    private BigDecimal valorTransferencia;
    private BigDecimal valorTotal;
    private BigDecimal gastos;
    private BigDecimal sobra;
    private BigDecimal falta;
    private BigDecimal coordinadoraValor;
    private BigDecimal ganaValor;
    private String observaciones;
    private LocalDateTime creadoEn = LocalDateTime.now();
}
