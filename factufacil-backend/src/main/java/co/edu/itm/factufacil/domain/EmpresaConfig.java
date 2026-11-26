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
@Table(name = "empresa_config")
@Getter @Setter @NoArgsConstructor
public class EmpresaConfig {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nombre;
    private String direccion;
    private String celular;
    @Column(columnDefinition = "MEDIUMTEXT")
    private String logo;
    private BigDecimal porcentajeIva;
    private LocalDateTime actualizadoEn;
}
