package com.neighborplates.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateComboRequest {

    @NotBlank(message = "Combo name is required")
    private String name;

    // Optional — controller generates a default description if absent
    private String description;

    private List<String> photos;

    @NotNull(message = "Combo price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Combo price must be greater than 0")
    private Double price;

    @NotBlank(message = "Cuisine type is required")
    private String cuisineType;

    private List<String> ingredients;
    private List<String> allergenTags;

    @Min(value = 1, message = "Portion limit must be at least 1")
    private int portionLimit;

    @NotNull(message = "Availability config is required")
    private CreateMealRequest.AvailabilityDto availability;

    // Combo-specific fields (optional if creating standalone combo deal)
    private List<String> includedMealIds;

    private double originalTotalPrice;

    @DecimalMin(value = "0.0", message = "Discount must be 0 or more")
    private Double discountPercentage;
}
