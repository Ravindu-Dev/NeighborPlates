package com.neighborplates.service;

import com.neighborplates.dto.request.FlagReviewRequest;
import com.neighborplates.dto.request.SubmitReviewRequest;
import com.neighborplates.dto.request.UpdateReviewRequest;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReviewService {

    private static final Logger logger = LoggerFactory.getLogger(ReviewService.class);

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

    public Review submitReview(String customerEmail, SubmitReviewRequest request) {
        logger.info("submitReview request by: '{}', orderId: '{}', mealId: '{}', rating: {}",
                customerEmail, request.getOrderId(), request.getMealId(), request.getRating());

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

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new IllegalArgumentException("The specified order does not contain any food items");
        }

        boolean mealInOrder = order.getItems().stream()
                .anyMatch(item -> item != null && item.getMealId() != null
                        && item.getMealId().equals(request.getMealId()));

        if (!mealInOrder) {
            throw new IllegalArgumentException("The specified meal was not part of this order");
        }

        Meal meal = mealRepository.findById(request.getMealId())
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));

        String cookId = meal.getCookId() != null ? meal.getCookId() : order.getCookId();
        User cook = null;
        if (cookId != null) {
            cook = userRepository.findById(cookId).orElse(null);
        }

        // Safely determine customer display name
        String customerName = "Customer";
        if (customer.getProfile() != null && customer.getProfile().getName() != null
                && !customer.getProfile().getName().trim().isEmpty()) {
            customerName = customer.getProfile().getName().trim();
        } else if (customer.getEmail() != null) {
            customerName = customer.getEmail().split("@")[0];
        }

        // Check if user already reviewed this meal for this order
        List<Review> existingReviews = reviewRepository.findByOrderIdAndMealId(order.getId(), meal.getId());
        Review review;
        if (existingReviews != null && !existingReviews.isEmpty()) {
            review = existingReviews.get(0);
            review.setRating(request.getRating());
            review.setComment(request.getComment());
            if (request.getPhotoUrl() != null) {
                review.setPhotoUrl(request.getPhotoUrl());
            }
            review.setUpdatedAt(Instant.now());

            // Clean up any extraneous duplicate review documents if they exist
            for (int i = 1; i < existingReviews.size(); i++) {
                try {
                    reviewRepository.delete(existingReviews.get(i));
                } catch (Exception ignored) {}
            }
        } else {
            review = new Review();
            review.setOrderId(order.getId());
            review.setMealId(meal.getId());
            review.setCookId(cookId != null ? cookId : "");
            review.setCustomerId(customer.getId());
            review.setCustomerName(customerName);
            review.setRating(request.getRating());
            review.setComment(request.getComment());
            review.setPhotoUrl(request.getPhotoUrl());
            review.setCreatedAt(Instant.now());
            review.setUpdatedAt(Instant.now());
        }

        review.setMealName(meal.getName() != null ? meal.getName() : "Home Cooked Meal");
        if (meal.getPhotos() != null && !meal.getPhotos().isEmpty()) {
            review.setMealPhoto(meal.getPhotos().get(0));
        }

        Review savedReview = reviewRepository.save(review);
        logger.info("Saved review with ID: '{}'", savedReview.getId());

        // Update embedded meal recent reviews
        if (meal.getRecentReviews() == null) {
            meal.setRecentReviews(new ArrayList<>());
        }
        List<Meal.RecentReview> recents = meal.getRecentReviews();
        recents.removeIf(r -> r == null
                || (r.getReviewId() != null && r.getReviewId().equals(savedReview.getId()))
                || (customer.getId() != null && customer.getId().equals(r.getUserId())));

        Meal.RecentReview recent = new Meal.RecentReview(
                savedReview.getId(),
                customer.getId(),
                customerName,
                request.getRating(),
                request.getComment(),
                savedReview.getPhotoUrl(),
                Instant.now()
        );
        recents.add(0, recent);
        if (recents.size() > 20) {
            recents.remove(recents.size() - 1);
        }

        // Re-calculate meal rating averages
        recalculateMealRating(meal);

        // Re-calculate cook rating averages
        if (cook != null) {
            recalculateCookRating(cook);
        }

        return savedReview;
    }

    public List<Review> getMyReviews(String customerEmail) {
        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        return reviewRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId());
    }

    public Review updateReview(String customerEmail, String reviewId, UpdateReviewRequest request) {
        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        if (!review.getCustomerId().equals(customer.getId())) {
            throw new UnauthorizedException("You are not authorized to edit this review");
        }

        review.setRating(request.getRating());
        review.setComment(request.getComment());
        if (request.getPhotoUrl() != null) {
            review.setPhotoUrl(request.getPhotoUrl());
        }
        review.setUpdatedAt(Instant.now());

        Review savedReview = reviewRepository.save(review);

        // Update embedded meal review & average
        mealRepository.findById(review.getMealId()).ifPresent(meal -> {
            if (meal.getRecentReviews() == null) {
                meal.setRecentReviews(new ArrayList<>());
            }
            List<Meal.RecentReview> recents = meal.getRecentReviews();
            for (Meal.RecentReview r : recents) {
                if (r != null && ((r.getReviewId() != null && r.getReviewId().equals(savedReview.getId()))
                        || customer.getId().equals(r.getUserId()))) {
                    r.setRating(savedReview.getRating());
                    r.setComment(savedReview.getComment());
                    r.setPhotoUrl(savedReview.getPhotoUrl());
                    break;
                }
            }
            recalculateMealRating(meal);
        });

        // Update cook average
        if (review.getCookId() != null && !review.getCookId().isEmpty()) {
            userRepository.findById(review.getCookId()).ifPresent(this::recalculateCookRating);
        }

        return savedReview;
    }

    public void deleteReview(String customerEmail, String reviewId) {
        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        if (!review.getCustomerId().equals(customer.getId())) {
            throw new UnauthorizedException("You are not authorized to delete this review");
        }

        String mealId = review.getMealId();
        String cookId = review.getCookId();

        reviewRepository.delete(review);

        // Remove from meal recent reviews and recalculate
        if (mealId != null) {
            mealRepository.findById(mealId).ifPresent(meal -> {
                if (meal.getRecentReviews() != null) {
                    meal.getRecentReviews().removeIf(r -> r == null
                            || (r.getReviewId() != null && r.getReviewId().equals(reviewId))
                            || (r.getUserId() != null && r.getUserId().equals(customer.getId())));
                }
                recalculateMealRating(meal);
            });
        }

        // Recalculate cook average
        if (cookId != null && !cookId.isEmpty()) {
            userRepository.findById(cookId).ifPresent(this::recalculateCookRating);
        }
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

    public List<Review> getReviewsByCook(String cookId) {
        return reviewRepository.findByCookIdOrderByCreatedAtDesc(cookId);
    }

    public List<Review> getReviewsByMeal(String mealId) {
        return reviewRepository.findByMealIdOrderByCreatedAtDesc(mealId);
    }

    public List<Review> getReviewsByOrderId(String orderId) {
        return reviewRepository.findByOrderId(orderId);
    }

    private void recalculateMealRating(Meal meal) {
        if (meal == null || meal.getId() == null) return;
        List<Review> mealReviews = reviewRepository.findByMealIdOrderByCreatedAtDesc(meal.getId());
        double mealAvg = (mealReviews != null && !mealReviews.isEmpty())
                ? mealReviews.stream().mapToDouble(Review::getRating).average().orElse(0.0)
                : 0.0;
        meal.setAvgRating(Math.round(mealAvg * 10.0) / 10.0);
        mealRepository.save(meal);
    }

    private void recalculateCookRating(User cook) {
        if (cook == null || cook.getId() == null) return;
        List<Review> cookReviews = reviewRepository.findByCookIdOrderByCreatedAtDesc(cook.getId());
        double cookAvg = (cookReviews != null && !cookReviews.isEmpty())
                ? cookReviews.stream().mapToDouble(Review::getRating).average().orElse(0.0)
                : 0.0;
        if (cook.getStats() == null) {
            cook.setStats(new User.UserStats());
        }
        cook.getStats().setAvgRating(Math.round(cookAvg * 10.0) / 10.0);
        userRepository.save(cook);
    }
}
