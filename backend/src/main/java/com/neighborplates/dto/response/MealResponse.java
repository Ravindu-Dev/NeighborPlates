package com.neighborplates.dto.response;

import com.neighborplates.model.Meal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MealResponse {
    private String id;
    private String cookId;
    private String cookName;
    private String name;
    private String description;
    private List<String> photos;
    private double price;
    private String category;
    private String cuisineType;
    private List<String> ingredients;
    private List<String> allergenTags;
    private int portionLimit;
    private int portionsRemaining;
    private Meal.MealAvailability availability;
    private List<Meal.RecentReview> recentReviews;
    private double avgRating;
    private int totalOrders;
    private boolean active;
    private Instant createdAt;
}
