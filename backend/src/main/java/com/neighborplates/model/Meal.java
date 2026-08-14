package com.neighborplates.model;

import com.neighborplates.model.enums.MealCategory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "meals")
public class Meal {

    @Id
    private String id;

    private String cookId; // Reference to User (cook role)

    private String name;

    private String description;

    private List<String> photos = new ArrayList<>(); // ImgBB URLs

    private double price;

    private MealCategory category;

    private String cuisineType;

    private List<String> ingredients = new ArrayList<>();

    private List<String> allergenTags = new ArrayList<>(); // "dairy", "nuts", "gluten", etc.

    private int portionLimit = 0;

    private int portionsRemaining = 0;

    private MealAvailability availability = new MealAvailability();

    private boolean active = true;

    private List<RecentReview> recentReviews = new ArrayList<>(); // Embedded reviews, max 20

    private double avgRating = 0.0;

    private int totalOrders = 0;

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealAvailability {
        private List<String> days = new ArrayList<>(); // "MON", "TUE", etc.
        private String cutoffTime; // "09:00" - pre-order cutoff time
        private String servingTime; // "12:00" - scheduled delivery/pickup time
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentReview {
        private String userId;
        private String userName;
        private int rating;
        private String comment;
        private String photoUrl;
        private Instant createdAt = Instant.now();
    }
}
