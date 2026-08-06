package com.neighborplates.controller;

import com.neighborplates.dto.response.AdminAnalyticsResponse;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Review;
import com.neighborplates.model.User;
import com.neighborplates.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')") // Enforce admin-only access on class level
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = adminService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<User> verifyCook(@PathVariable String id) {
        User user = adminService.verifyCook(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/analytics")
    public ResponseEntity<AdminAnalyticsResponse> getPlatformAnalytics() {
        AdminAnalyticsResponse response = adminService.getPlatformAnalytics();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/meals")
    public ResponseEntity<List<Meal>> getAllMeals() {
        List<Meal> meals = adminService.getAllMeals();
        return ResponseEntity.ok(meals);
    }

    @PutMapping("/meals/{id}/toggle-active")
    public ResponseEntity<Meal> toggleMealActive(@PathVariable String id) {
        Meal meal = adminService.toggleMealActiveStatus(id);
        return ResponseEntity.ok(meal);
    }

    @GetMapping("/reviews")
    public ResponseEntity<List<Review>> getAllReviews(@RequestParam(required = false) Boolean flagged) {
        List<Review> reviews = adminService.getAllReviews(flagged);
        return ResponseEntity.ok(reviews);
    }

    @PutMapping("/reviews/{id}/dismiss-flag")
    public ResponseEntity<Review> dismissReviewFlag(@PathVariable String id) {
        Review review = adminService.dismissReviewFlag(id);
        return ResponseEntity.ok(review);
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<ApiResponse> deleteReview(@PathVariable String id) {
        adminService.deleteReview(id);
        return ResponseEntity.ok(new ApiResponse(true, "Review deleted successfully"));
    }
}
