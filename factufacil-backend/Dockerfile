# Imagen del servidor para Render (o cualquier servicio que corra Docker).
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/factufacil-backend-1.0.0.jar app.jar
# Memoria ajustada para el plan gratuito (512 MB)
ENV JAVA_TOOL_OPTIONS="-Xmx320m -XX:+UseSerialGC"
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
