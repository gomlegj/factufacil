package co.edu.itm.factufacil;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class FactufacilApplication {

    @PostConstruct
    void zonaHoraria() {
        // Las fechas del negocio se manejan en hora de Colombia
        TimeZone.setDefault(TimeZone.getTimeZone("America/Bogota"));
    }

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Bogota"));
        SpringApplication.run(FactufacilApplication.class, args);
    }
}
