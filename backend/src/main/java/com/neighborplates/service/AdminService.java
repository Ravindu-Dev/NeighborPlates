package com.neighborplates.service;

import com.neighborplates.dto.response.AdminAnalyticsResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public AdminService(UserRepository userRepository, OrderRepository orderRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
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
}
