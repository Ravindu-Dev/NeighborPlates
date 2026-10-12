package com.neighborplates.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleRequest {

    @NotBlank(message = "Vehicle type is required")
    private String vehicleType;

    @NotBlank(message = "Make and model is required")
    @Size(max = 100, message = "Make and model cannot exceed 100 characters")
    private String makeModel;

    @NotBlank(message = "Plate or registration number is required")
    @Size(max = 50, message = "Plate number cannot exceed 50 characters")
    private String plateNumber;

    private String color;

    private Integer year;

    private Boolean isPrimary;
}
