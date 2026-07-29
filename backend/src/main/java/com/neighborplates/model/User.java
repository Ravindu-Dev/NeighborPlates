package com.neighborplates.model;

import com.neighborplates.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String passwordHash;

    private UserRole role;

    private UserProfile profile = new UserProfile();

    private UserStats stats = new UserStats();

    private List<String> favorites = new ArrayList<>(); // Cook IDs favorited by customer

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfile {
        private String name;
        private String phone;
        private String avatarUrl;
        private String bio; // Cook only
        private List<String> kitchenPhotos = new ArrayList<>(); // Cook only
        private boolean hygieneVerified = false; // Cook verification status
        private GeoJsonPoint location = new GeoJsonPoint();
        private Double deliveryRadius; // km, Cook only
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserStats {
        private int totalOrders = 0;
        private double avgRating = 0.0;
        private double totalEarnings = 0.0; // Cook only
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeoJsonPoint {
        private String type = "Point";
        private List<Double> coordinates = new ArrayList<>(); // [longitude, latitude]
    }
}
