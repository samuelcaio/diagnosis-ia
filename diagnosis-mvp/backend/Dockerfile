# Dockerfile - Spring Boot Backend
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENV DB_HOST=db
ENV DB_PORT=5432
ENV DB_NAME=diagnosis
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENTRYPOINT ["java", "-jar", "app.jar"]
