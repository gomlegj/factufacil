package co.edu.itm.factufacil.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;

/** Ayudas pequeñas para montos y textos. */
public final class Num {
    private Num() {}

    public static BigDecimal v(BigDecimal b) { return b == null ? BigDecimal.ZERO : b; }

    public static int v(Integer i) { return i == null ? 0 : i; }

    /** Redondea a pesos completos, como la interfaz. */
    public static BigDecimal pesos(BigDecimal b) { return v(b).setScale(0, RoundingMode.HALF_UP).setScale(2); }

    public static boolean negativo(BigDecimal b) { return v(b).signum() < 0; }

    public static String texto(String s) { return s == null ? "" : s.trim(); }

    public static boolean vacio(String s) { return s == null || s.isBlank(); }

    /** Compara sin tildes ni mayúsculas. */
    public static String norm(String s) {
        return Normalizer.normalize(texto(s), Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase();
    }

    public static String fmt(BigDecimal b) { return v(b).setScale(0, RoundingMode.HALF_UP).toPlainString(); }
}
