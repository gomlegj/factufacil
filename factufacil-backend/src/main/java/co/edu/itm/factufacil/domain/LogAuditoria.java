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
@Table(name = "log_auditoria")
@Getter @Setter @NoArgsConstructor
public class LogAuditoria {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "tabla_afectada")
    private String tabla;
    private Long registroId;
    private String accion;
    private Long empleadoId;
    @Column(columnDefinition = "TEXT")
    private String detalle;
    private LocalDateTime fecha = LocalDateTime.now();
}
