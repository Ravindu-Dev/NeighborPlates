package com.neighborplates.service;

import com.neighborplates.dto.request.FlagReviewRequest;
import com.neighborplates.dto.request.SubmitReviewRequest;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Order;
import com.neighborplates.model.Review;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.OrderStatus;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.MealRepository;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.ReviewRepository;
import com.neighborplates.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final MealRepository mealRepository;
    private final UserRepository userRepository;

    public ReviewService(ReviewRepository reviewRepository,
                         OrderRepository orderRepository,
                         MealRepository mealRepository,
                         UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.mealRepository = mealRepository;
        this.userRepository = userRepository;
    }

    public void submitReview(String customerEmail, SubmitReviewRequest request) {
        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new UnauthorizedException("Only customers can submit reviews");
        }

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (!order.getCustomerId().equals(customer.getId())) {
            throw new UnauthorizedException("You can only review meals from your own orders");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalArgumentException("You can only review meals from delivered orders");
        }

        boolean mealInOrder = order.getItems().stream()
                .anyMatch(item -> item.getMealId().equals(request.getMealId()));

        if (!mealInOrder) {
            throw new IllegalArgumentException("The specified meal was not part of this order");
        }

        Meal meal = mealRepository.findById(request.getMealId())
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));

        User cook = userRepository.findById(meal.getCookId())
                .orElseThrow(() -> new ResourceNotFoundException("Cook account not found"));

        // Create new Review document
        Review review = new Review();
        review.setOrderId(order.getId());
        review.setMealId(meal.getId());
        review.setCookId(cook.getId());
        review.setCustomerId(customer.getId());
        review.setCustomerName(customer.getProfile().getName());
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setCreatedAt(Instant.now());

        reviewRepository.save(review);

        // Embed in Meal recentReviews (Max 20 list capping)
        Meal.RecentReview recent = new Meal.RecentReview(
                customer.getId(),
                customer.getProfile().getName(),
                request.getRating(),
                request.getComment(),
                Instant.now()
        );

        List<Meal.RecentReview> recents = meal.getRecentReviews();
        recents.add(0, recent); // Add to beginning (newest first)
        if (recents.size() > 20) {
            recents.remove(recents.size() - 1);
        }

        // Re-calculate meal rating averages
        List<Review> mealReviews = reviewRepository.findByMealIdOrderByCreatedAtDesc(meal.getId());
        double mealAvg = mealReviews.stream()
                .mapToDouble(Review::getRating)
                .average()
                .orElse(0.0);
        meal.setAvgRating(mealAvg);
        mealRepository.save(meal);

        // Re-calculate cook rating averages
        List<Review> cookReviews = reviewRepository.findByCookIdOrderByCreatedAtDesc(cook.getId());
        double cookAvg = cookReviews.stream()
                .mapToDouble(Review::getRating)
                .average()
                .orElse(0.0);
        cook.getStats().setAvgRating(cookAvg);
        userRepository.save(cook);
    }

    public void flagReview(String customerEmail, String reviewId, FlagReviewRequest request) {
        userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        review.setFlagged(true);
        review.setFlaggedReason(request.getReason());
        reviewRepository.save(review);
    }
}
