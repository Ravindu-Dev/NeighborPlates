package com.neighborplates.dto.request;

import com.neighborplates.model.enums.MealCategory;
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
public class CreateMealRequest {

    @NotBlank(message = "Meal name is required")
    private String name;

    @NotBlank(message = "Meal description is required")
    private String description;

    private List<String> photos; // ImgBB URL strings

    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    private double price;

    @NotNull(message = "Category is required")
    private MealCategory category;

    @NotBlank(message = "Cuisine type is required")
    private String cuisineType;

    private List<String> ingredients;

    private List<String> allergenTags;

    @Min(value = 1, message = "Portion limit must be at least 1")
    private int portionLimit;

    @NotNull(message = "Availability config is required")
    private AvailabilityDto availability;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AvailabilityDto {
        private List<String> days;
        private String cutoffTime;  // "09:00"
        private String servingTime; // "12:00"
    }
}
