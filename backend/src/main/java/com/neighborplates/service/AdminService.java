package com.neighborplates.service;

import com.neighborplates.dto.response.AdminAnalyticsResponse;
import com.neighborplates.dto.response.AdminPayoutSummaryResponse;
import com.neighborplates.exception.ResourceNotFoundException;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    public User verifyRider(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.RIDER) {
            throw new IllegalArgumentException("User must be registered as a rider to verify background & vehicle info");
        }

        user.getProfile().setRiderVerified(!user.getProfile().isRiderVerified());
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

    public User toggleUserActiveStatus(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setActive(!user.isActive());
        user.setUpdatedAt(java.time.Instant.now());
        return userRepository.save(user);
    }

    public AdminPayoutSummaryResponse getPayoutSummary() {
        List<Order> allOrders = orderRepository.findAll();
        List<User> allUsers = userRepository.findAll();

        double totalRevenue = allOrders.stream().mapToDouble(Order::getTotalAmount).sum();
        double totalCommission = allOrders.stream().mapToDouble(Order::getPlatformFee).sum();

        // Filter orders that are completed / delivered
        List<Order> deliveredOrders = allOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                .collect(Collectors.toList());

        double totalPendingCookPayouts = deliveredOrders.stream()
                .filter(o -> !o.isCookPayoutSettled())
                .mapToDouble(Order::getCookEarnings)
                .sum();

        double totalSettledCookPayouts = deliveredOrders.stream()
                .filter(Order::isCookPayoutSettled)
                .mapToDouble(Order::getCookEarnings)
                .sum();

        double totalPendingRiderPayouts = deliveredOrders.stream()
                .filter(o -> !o.isRiderPayoutSettled() && o.getRiderEarnings() != null)
                .mapToDouble(o -> o.getRiderEarnings() == null ? 0.0 : o.getRiderEarnings())
                .sum();

        double totalSettledRiderPayouts = deliveredOrders.stream()
                .filter(o -> o.isRiderPayoutSettled() && o.getRiderEarnings() != null)
                .mapToDouble(o -> o.getRiderEarnings() == null ? 0.0 : o.getRiderEarnings())
                .sum();

        // Calculate balances per Cook and Rider
        Map<String, User> userMap = allUsers.stream().collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));
        List<AdminPayoutSummaryResponse.UserPayoutBalance> userBalances = new ArrayList<>();

        // Group Cook pending payouts
        Map<String, List<Order>> cookOrders = deliveredOrders.stream()
                .filter(o -> o.getCookId() != null)
                .collect(Collectors.groupingBy(Order::getCookId));

        cookOrders.forEach((cookId, orders) -> {
            User cook = userMap.get(cookId);
            if (cook != null) {
                double pending = orders.stream().filter(o -> !o.isCookPayoutSettled()).mapToDouble(Order::getCookEarnings).sum();
                double total = orders.stream().mapToDouble(Order::getCookEarnings).sum();
                int pendingCount = (int) orders.stream().filter(o -> !o.isCookPayoutSettled()).count();

                userBalances.add(new AdminPayoutSummaryResponse.UserPayoutBalance(
                        cook.getId(),
                        cook.getProfile() != null ? cook.getProfile().getName() : "Cook",
                        cook.getEmail(),
                        cook.getProfile() != null ? cook.getProfile().getPhone() : null,
                        UserRole.COOK,
                        pending,
                        total,
                        pendingCount
                ));
            }
        });

        // Group Rider pending payouts
        Map<String, List<Order>> riderOrders = deliveredOrders.stream()
                .filter(o -> o.getRiderId() != null)
                .collect(Collectors.groupingBy(Order::getRiderId));

        riderOrders.forEach((riderId, orders) -> {
            User rider = userMap.get(riderId);
            if (rider != null) {
                double pending = orders.stream().filter(o -> !o.isRiderPayoutSettled()).mapToDouble(o -> o.getRiderEarnings() == null ? 0.0 : o.getRiderEarnings()).sum();
                double total = orders.stream().mapToDouble(o -> o.getRiderEarnings() == null ? 0.0 : o.getRiderEarnings()).sum();
                int pendingCount = (int) orders.stream().filter(o -> !o.isRiderPayoutSettled()).count();

                userBalances.add(new AdminPayoutSummaryResponse.UserPayoutBalance(
                        rider.getId(),
                        rider.getProfile() != null ? rider.getProfile().getName() : "Rider",
                        rider.getEmail(),
                        rider.getProfile() != null ? rider.getProfile().getPhone() : null,
                        UserRole.RIDER,
                        pending,
                        total,
                        pendingCount
                ));
            }
        });

        return new AdminPayoutSummaryResponse(
                totalRevenue,
                totalCommission,
                totalPendingCookPayouts,
                totalSettledCookPayouts,
                totalPendingRiderPayouts,
                totalSettledRiderPayouts,
                userBalances
        );
    }

    public AdminPayoutSummaryResponse.UserPayoutBalance settleUserPayouts(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Order> orders = orderRepository.findAll();
        boolean isCook = user.getRole() == UserRole.COOK;

        for (Order o : orders) {
            if (o.getStatus() == OrderStatus.DELIVERED) {
                if (isCook && userId.equals(o.getCookId())) {
                    o.setCookPayoutSettled(true);
                    o.setUpdatedAt(java.time.Instant.now());
                    orderRepository.save(o);
                } else if (!isCook && userId.equals(o.getRiderId())) {
                    o.setRiderPayoutSettled(true);
                    o.setUpdatedAt(java.time.Instant.now());
                    orderRepository.save(o);
                }
            }
        }

        // Return updated balance info for user
        List<Order> userOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED && (isCook ? userId.equals(o.getCookId()) : userId.equals(o.getRiderId())))
                .collect(Collectors.toList());

        double total = userOrders.stream().mapToDouble(o -> isCook ? o.getCookEarnings() : (o.getRiderEarnings() == null ? 0.0 : o.getRiderEarnings())).sum();

        return new AdminPayoutSummaryResponse.UserPayoutBalance(
                user.getId(),
                user.getProfile() != null ? user.getProfile().getName() : user.getRole().name(),
                user.getEmail(),
                user.getProfile() != null ? user.getProfile().getPhone() : null,
                user.getRole(),
                0.0, // pending balance after settlement is 0
                total,
                0
        );
    }
}
