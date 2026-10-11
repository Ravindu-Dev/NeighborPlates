package com.neighborplates.controller;

import com.neighborplates.dto.request.FlagReviewRequest;
import com.neighborplates.dto.request.SubmitReviewRequest;
import com.neighborplates.dto.request.UpdateReviewRequest;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.model.Review;
import com.neighborplates.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> submitReview(
            @Valid @RequestBody SubmitReviewRequest request,
            Principal principal) {
        reviewService.submitReview(principal.getName(), request);
        return ResponseEntity.ok(new ApiResponse(true, "Review submitted successfully"));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Review>> getMyReviews(Principal principal) {
        List<Review> reviews = reviewService.getMyReviews(principal.getName());
        return ResponseEntity.ok(reviews);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateReview(
            @PathVariable String id,
            @Valid @RequestBody UpdateReviewRequest request,
            Principal principal) {
        reviewService.updateReview(principal.getName(), id, request);
        return ResponseEntity.ok(new ApiResponse(true, "Review updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteReview(
            @PathVariable String id,
            Principal principal) {
        reviewService.deleteReview(principal.getName(), id);
        return ResponseEntity.ok(new ApiResponse(true, "Review deleted successfully"));
    }

    @PutMapping("/{id}/flag")
    public ResponseEntity<ApiResponse> flagReview(
            @PathVariable String id,
            @Valid @RequestBody FlagReviewRequest request,
            Principal principal) {
        reviewService.flagReview(principal.getName(), id, request);
        return ResponseEntity.ok(new ApiResponse(true, "Review flagged successfully"));
    }

    @GetMapping("/cook/{cookId}")
    public ResponseEntity<List<Review>> getReviewsByCook(@PathVariable String cookId) {
        List<Review> reviews = reviewService.getReviewsByCook(cookId);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/meal/{mealId}")
    public ResponseEntity<List<Review>> getReviewsByMeal(@PathVariable String mealId) {
        List<Review> reviews = reviewService.getReviewsByMeal(mealId);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<Review>> getReviewsByOrder(@PathVariable String orderId) {
        List<Review> reviews = reviewService.getReviewsByOrderId(orderId);
        return ResponseEntity.ok(reviews);
    }
}
