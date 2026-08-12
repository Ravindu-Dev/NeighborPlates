package com.neighborplates.controller;

import com.neighborplates.dto.response.AdminAnalyticsResponse;
import com.neighborplates.dto.response.AdminPayoutSummaryResponse;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Order;
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

    @PutMapping("/riders/{id}/verify")
    public ResponseEntity<User> verifyRider(@PathVariable String id) {
        User user = adminService.verifyRider(id);
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

    @PutMapping("/users/{id}/toggle-active")
    public ResponseEntity<User> toggleUserActive(@PathVariable String id) {
        User user = adminService.toggleUserActiveStatus(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/payouts/summary")
    public ResponseEntity<AdminPayoutSummaryResponse> getPayoutSummary() {
        AdminPayoutSummaryResponse response = adminService.getPayoutSummary();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/payouts/settle/{userId}")
    public ResponseEntity<AdminPayoutSummaryResponse.UserPayoutBalance> settleUserPayouts(@PathVariable String userId) {
        AdminPayoutSummaryResponse.UserPayoutBalance result = adminService.settleUserPayouts(userId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/operations/live")
    public ResponseEntity<com.neighborplates.dto.response.LiveOperationsSummaryResponse> getLiveOperationsSummary() {
        com.neighborplates.dto.response.LiveOperationsSummaryResponse response = adminService.getLiveOperationsSummary();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/orders/{id}/reassign-rider/{riderId}")
    public ResponseEntity<Order> reassignRider(@PathVariable String id, @PathVariable String riderId) {
        Order order = adminService.reassignOrderRider(id, riderId);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/orders/{id}/resolve-dispute")
    public ResponseEntity<Order> resolveDispute(
            @PathVariable String id,
            @RequestBody com.neighborplates.dto.request.ResolveDisputeRequest request) {
        Order order = adminService.resolveOrderDispute(id, request);
        return ResponseEntity.ok(order);
    }

    @PutMapping("/orders/{id}/force-status")
    public ResponseEntity<Order> forceStatus(
            @PathVariable String id,
            @RequestParam com.neighborplates.model.enums.OrderStatus status,
            @RequestParam(required = false) String adminNotes) {
        Order order = adminService.forceUpdateOrderStatus(id, status, adminNotes);
        return ResponseEntity.ok(order);
    }
}
