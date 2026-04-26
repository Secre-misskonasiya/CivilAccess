# Use Java 21
FROM eclipse-temurin:21-jdk-alpine

# Set working directory
WORKDIR /app

# Copy Maven files first
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Fix permission for mvnw
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline

# Copy source code
COPY src ./src

# Build the app
RUN ./mvnw package -DskipTests

# Expose port
EXPOSE 8080

# Run the app
ENTRYPOINT ["java", "-jar", "target/*.jar", "--spring.config.location=file:/etc/secrets/application.properties"]