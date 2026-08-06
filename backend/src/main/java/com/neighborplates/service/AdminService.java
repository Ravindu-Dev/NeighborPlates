package com.neighborplates.service;

import com.neighborplates.dto.response.AdminAnalyticsResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Order;
import com.neighborplates.model.Review;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.MealRepository;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.ReviewRepository;
import com.neighborplates.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final MealRepository mealRepository;
    private final ReviewRepository reviewRepository;

    public AdminService(UserRepository userRepository,
                        OrderRepository orderRepository,
                        MealRepository mealRepository,
                        ReviewRepository reviewRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.mealRepository = mealRepository;
        this.reviewRepository = reviewRepository;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User verifyCook(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.COOK) {
            throw new IllegalArgumentException("User must be registered as a cook to verify hygiene compliance");
        }

        user.getProfile().setHygieneVerified(true);
        return userRepository.save(user);
    }

    public AdminAnalyticsResponse getPlatformAnalytics() {
        List<User> users = userRepository.findAll();
        List<Order> orders = orderRepository.findAll();

        long totalUsers = users.size();
        long totalCustomers = users.stream().filter(u -> u.getRole() == UserRole.CUSTOMER).count();
        long totalCooks = users.stream().filter(u -> u.getRole() == UserRole.COOK).count();

        long totalOrders = orders.size();
        double totalRevenue = orders.stream().mapToDouble(Order::getTotalAmount).sum();
        double totalCommission = orders.stream().mapToDouble(Order::getPlatformFee).sum();

        return new AdminAnalyticsResponse(
                totalUsers,
                totalCustomers,
                totalCooks,
                totalOrders,
                totalRevenue,
                totalCommission
        );
    }

    public List<Meal> getAllMeals() {
        return mealRepository.findAll();
    }

    public Meal toggleMealActiveStatus(String id) {
        Meal meal = mealRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));
        meal.setActive(!meal.isActive());
        meal.setUpdatedAt(java.time.Instant.now());
        return mealRepository.save(meal);
    }

    public List<Review> getAllReviews(Boolean flaggedOnly) {
        if (Boolean.TRUE.equals(flaggedOnly)) {
            return reviewRepository.findByFlaggedTrueOrderByCreatedAtDesc();
        }
        return reviewRepository.findAllByOrderByCreatedAtDesc();
    }

    public Review dismissReviewFlag(String id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setFlagged(false);
        review.setFlaggedReason(null);
        return reviewRepository.save(review);
    }

    public void deleteReview(String id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        reviewRepository.delete(review);

        // Update embedded review in the associated Meal
        Meal meal = mealRepository.findById(review.getMealId()).orElse(null);
        if (meal != null) {
            // Remove review from recentReviews list
            meal.getRecentReviews().removeIf(r -> r.getUserId().equals(review.getCustomerId()) && r.getComment().equals(review.getComment()));

            // Re-calculate meal rating averages
            List<Review> mealReviews = reviewRepository.findByMealIdOrderByCreatedAtDesc(meal.getId());
            double mealAvg = mealReviews.stream()
                    .mapToDouble(Review::getRating)
                    .average()
                    .orElse(0.0);
            meal.setAvgRating(mealAvg);
            mealRepository.save(meal);
        }

        // Re-calculate cook rating averages
        User cook = userRepository.findById(review.getCookId()).orElse(null);
        if (cook != null) {
            List<Review> cookReviews = reviewRepository.findByCookIdOrderByCreatedAtDesc(cook.getId());
            double cookAvg = cookReviews.stream()
                    .mapToDouble(Review::getRating)
                    .average()
                    .orElse(0.0);
            cook.getStats().setAvgRating(cookAvg);
            userRepository.save(cook);
        }
    }
}
