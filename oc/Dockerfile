# Build stage
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /workspace

# Copiar archivos necesarios para cachear dependencias
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw || true

# Copiar el código fuente
COPY src ./src

# Build del jar
RUN ./mvnw -B -DskipTests package

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copiar jar desde el builder
COPY --from=builder /workspace/target/*.jar app.jar

ENV JAVA_OPTS="-Xms256m -Xmx512m"
EXPOSE 9000
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]

