package com.neighborplates.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "vehicles")
public class Vehicle {

    @Id
    private String id;

    @Indexed
    private String riderId;

    private String vehicleType; // e.g. "E-Bike", "Scooter", "Motorcycle", "Bicycle", "Car"

    private String makeModel; // e.g. "Rad Power E-Bike Pro"

    private String plateNumber; // e.g. "#EB-4092"

    private String color; // e.g. "Matte Black"

    private Integer year; // e.g. 2023

    @Builder.Default
    private Boolean isPrimary = false;

    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
