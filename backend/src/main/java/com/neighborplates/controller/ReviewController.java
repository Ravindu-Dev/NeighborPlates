package com.neighborplates.controller;

import com.neighborplates.dto.request.SubmitReviewRequest;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

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
}
