package com.neighborplates.service;

import com.neighborplates.dto.request.PlaceOrderRequest;
import com.neighborplates.dto.response.OrderResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.OrderStatus;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.MealRepository;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final MealRepository mealRepository;
    private final UserRepository userRepository;
    private final FirebaseNotificationService firebaseNotificationService;
    private final Random random = new Random();

    public OrderService(OrderRepository orderRepository,
                        MealRepository mealRepository,
                        UserRepository userRepository,
                        FirebaseNotificationService firebaseNotificationService) {
        this.orderRepository = orderRepository;
        this.mealRepository = mealRepository;
        this.userRepository = userRepository;
        this.firebaseNotificationService = firebaseNotificationService;
    }

    public OrderResponse placeOrder(String customerEmail, PlaceOrderRequest request) {
        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new UnauthorizedException("Only customers can place order requests");
        }

        User cook = userRepository.findById(request.getCookId())
                .orElseThrow(() -> new ResourceNotFoundException("Cook not found"));

        if (cook.getRole() != UserRole.COOK) {
            throw new IllegalArgumentException("Specified user is not registered as a cook");
        }

        double totalAmount = 0.0;
        List<Order.OrderItem> orderItems = new ArrayList<>();

        for (PlaceOrderRequest.OrderItemDto itemDto : request.getItems()) {
            Meal meal = mealRepository.findById(itemDto.getMealId())
                    .orElseThrow(() -> new ResourceNotFoundException("Meal not found: " + itemDto.getMealId()));

            if (!meal.isActive()) {
                throw new IllegalArgumentException("Meal listing is currently inactive: " + meal.getName());
            }

            if (!meal.getCookId().equals(cook.getId())) {
                throw new IllegalArgumentException("Meal " + meal.getName() + " does not belong to the selected cook");
            }

            // Portion check and decrement (Task 3.5)
            if (meal.getPortionsRemaining() < itemDto.getQuantity()) {
                throw new IllegalArgumentException("Insufficient portions available for: " + meal.getName()
                        + " (Requested: " + itemDto.getQuantity() + ", Available: " + meal.getPortionsRemaining() + ")");
            }

            meal.setPortionsRemaining(meal.getPortionsRemaining() - itemDto.getQuantity());
            meal.setTotalOrders(meal.getTotalOrders() + itemDto.getQuantity());
            mealRepository.save(meal);

            double itemTotal = meal.getPrice() * itemDto.getQuantity();
            totalAmount += itemTotal;

            orderItems.add(new Order.OrderItem(meal.getId(), meal.getName(), meal.getPrice(), itemDto.getQuantity()));
        }

        // Platform fee: 5% platform commission
        double platformFee = totalAmount * 0.05;
        double cookEarnings = totalAmount - platformFee;

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setCustomerId(customer.getId());
        order.setCookId(cook.getId());
        order.setItems(orderItems);
        order.setTotalAmount(totalAmount);
        order.setPlatformFee(platformFee);
        order.setCookEarnings(cookEarnings);
        order.setStatus(OrderStatus.PLACED);

        List<Order.StatusHistoryItem> history = new ArrayList<>();
        history.add(new Order.StatusHistoryItem(OrderStatus.PLACED, Instant.now()));
        order.setStatusHistory(history);

        order.setDeliveryMethod(request.getDeliveryMethod());

        Order.DeliveryAddress address = new Order.DeliveryAddress();
        address.setLabel(request.getAddress().getLabel());
        address.setCoordinates(request.getAddress().getCoordinates() != null ? request.getAddress().getCoordinates() : new ArrayList<>());
        order.setAddress(address);

        order.setScheduledFor(request.getScheduledFor() != null ? request.getScheduledFor() : Instant.now().plusSeconds(3600)); // Default 1 hour delay if not set
        order.setSpecialInstructions(request.getSpecialInstructions());
        order.setPaymentTransactionId(request.getPaymentTransactionId());
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());

        // TTL indexing mapping (90 days auto-delete)
        order.setTtlExpiryDate(Instant.now().plusSeconds(7776000));

        // Increment user order statistics
        customer.getStats().setTotalOrders(customer.getStats().getTotalOrders() + 1);
        userRepository.save(customer);

        Order savedOrder = orderRepository.save(order);
        firebaseNotificationService.updateOrderTrackingStatus(savedOrder.getId(), "PLACED");
        return mapToOrderResponse(savedOrder, customer.getProfile().getName(), cook.getProfile().getName(), null);
    }

    public List<OrderResponse> getAvailableOrdersForRiders() {
        List<Order> orders = orderRepository.findByStatusInAndRiderIdIsNull(
                List.of(OrderStatus.READY, OrderStatus.PREPARING, OrderStatus.ACCEPTED, OrderStatus.PLACED)
        );
        return orders.stream()
                .map(order -> {
                    User customer = userRepository.findById(order.getCustomerId()).orElse(null);
                    User cook = userRepository.findById(order.getCookId()).orElse(null);
                    return mapToOrderResponse(order, customer, cook, null);
                })
                .collect(Collectors.toList());
    }

    public OrderResponse acceptOrderAsRider(String email, String orderId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.RIDER) {
            throw new UnauthorizedException("Only riders can accept orders for delivery");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (order.getRiderId() != null) {
            throw new IllegalArgumentException("Someone else got there first");
        }

        if (order.getStatus() != OrderStatus.READY && order.getStatus() != OrderStatus.PREPARING && order.getStatus() != OrderStatus.ACCEPTED && order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.DELIVERING) {
            throw new IllegalArgumentException("Only active or preparing orders can be accepted by a rider");
        }

        // Assign rider to order and calculate fair rider earnings (15% of total amount or 150 min)
        order.setRiderId(user.getId());
        double earnings = Math.max(150.0, order.getTotalAmount() * 0.15);
        earnings = Math.round(earnings * 100.0) / 100.0;
        order.setRiderEarnings(earnings);

        Order savedOrder = orderRepository.save(order);

        User customer = userRepository.findById(order.getCustomerId()).orElse(null);
        User cook = userRepository.findById(order.getCookId()).orElse(null);

        return mapToOrderResponse(savedOrder, customer, cook, user);
    }

    public List<OrderResponse> getMyOrders(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Order> orders;
        if (user.getRole() == UserRole.CUSTOMER) {
            orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(user.getId());
        } else if (user.getRole() == UserRole.COOK) {
            orders = orderRepository.findByCookIdOrderByCreatedAtDesc(user.getId());
        } else if (user.getRole() == UserRole.RIDER) {
            orders = orderRepository.findByRiderIdOrderByCreatedAtDesc(user.getId());
        } else {
            orders = orderRepository.findAll(); // Admins see all
        }

        return orders.stream()
                .map(order -> {
                    User customer = userRepository.findById(order.getCustomerId()).orElse(null);
                    User cook = userRepository.findById(order.getCookId()).orElse(null);
                    User rider = order.getRiderId() != null ? userRepository.findById(order.getRiderId()).orElse(null) : null;
                    return mapToOrderResponse(order, customer, cook, rider);
                })
                .collect(Collectors.toList());
    }

    public OrderResponse getOrderById(String email, String orderId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        boolean isAuthorized = (user.getRole() == UserRole.ADMIN)
                || (user.getRole() == UserRole.CUSTOMER && order.getCustomerId().equals(user.getId()))
                || (user.getRole() == UserRole.COOK && order.getCookId().equals(user.getId()))
                || (user.getRole() == UserRole.RIDER && user.getId().equals(order.getRiderId()));

        if (!isAuthorized) {
            throw new UnauthorizedException("You are not authorized to access this order");
        }

        User customer = userRepository.findById(order.getCustomerId()).orElse(null);
        User cook = userRepository.findById(order.getCookId()).orElse(null);
        User rider = order.getRiderId() != null ? userRepository.findById(order.getRiderId()).orElse(null) : null;
        return mapToOrderResponse(order, customer, cook, rider);
    }

    public OrderResponse updateOrderStatus(String email, String orderId, OrderStatus newStatus) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        User customer = userRepository.findById(order.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer account not found"));

        User cook = userRepository.findById(order.getCookId())
                .orElseThrow(() -> new ResourceNotFoundException("Cook account not found"));

        // Validate security access permissions
        if (user.getRole() == UserRole.CUSTOMER) {
            if (!order.getCustomerId().equals(user.getId())) {
                throw new UnauthorizedException("You are not authorized to access this order details");
            }
            // Customers can only cancel placed orders
            if (newStatus != OrderStatus.CANCELLED) {
                throw new IllegalArgumentException("Customers are only permitted to cancel pending order requests");
            }
            if (order.getStatus() != OrderStatus.PLACED) {
                throw new IllegalArgumentException("Cannot cancel an order that has already been accepted by the cook");
            }
        } else if (user.getRole() == UserRole.COOK) {
            if (!order.getCookId().equals(user.getId())) {
                throw new UnauthorizedException("You do not own this order's cooking queue");
            }
            // Cook-side state transitions check
            validateStateTransition(order.getStatus(), newStatus);
        } else if (user.getRole() == UserRole.RIDER) {
            if (!user.getId().equals(order.getRiderId())) {
                throw new UnauthorizedException("You are not assigned to this order");
            }
            if (newStatus != OrderStatus.DELIVERING && newStatus != OrderStatus.DELIVERED) {
                throw new IllegalArgumentException("Riders can only transition orders to DELIVERING or DELIVERED");
            }
            validateStateTransition(order.getStatus(), newStatus);
            if (newStatus == OrderStatus.DELIVERING) {
                order.setPickedUpAt(Instant.now());
            } else if (newStatus == OrderStatus.DELIVERED) {
                order.setDeliveredAt(Instant.now());
            }
        } else if (user.getRole() != UserRole.ADMIN) {
            throw new UnauthorizedException("Insufficient roles for status updates");
        }

        // Return portions back to remaining count if cancelled
        if (newStatus == OrderStatus.CANCELLED) {
            for (Order.OrderItem item : order.getItems()) {
                Meal meal = mealRepository.findById(item.getMealId()).orElse(null);
                if (meal != null) {
                    meal.setPortionsRemaining(meal.getPortionsRemaining() + item.getQuantity());
                    mealRepository.save(meal);
                }
            }
        }

        // Update statistics if completed
        if (newStatus == OrderStatus.DELIVERED && order.getStatus() != OrderStatus.DELIVERED) {
            cook.getStats().setTotalOrders(cook.getStats().getTotalOrders() + 1);
            cook.getStats().setTotalEarnings(cook.getStats().getTotalEarnings() + order.getCookEarnings());
            userRepository.save(cook);

            if (order.getRiderId() != null) {
                User riderUser = userRepository.findById(order.getRiderId()).orElse(null);
                if (riderUser != null) {
                    riderUser.getStats().setTotalOrders(riderUser.getStats().getTotalOrders() + 1);
                    double riderEarn = order.getRiderEarnings() != null ? order.getRiderEarnings() : 0.0;
                    riderUser.getStats().setTotalEarnings(riderUser.getStats().getTotalEarnings() + riderEarn);
                    userRepository.save(riderUser);
                }
            }
        }

        order.setStatus(newStatus);
        order.getStatusHistory().add(new Order.StatusHistoryItem(newStatus, Instant.now()));
        order.setUpdatedAt(Instant.now());

        Order updatedOrder = orderRepository.save(order);
        firebaseNotificationService.updateOrderTrackingStatus(updatedOrder.getId(), newStatus.name());
        User rider = order.getRiderId() != null ? userRepository.findById(order.getRiderId()).orElse(null) : null;
        return mapToOrderResponse(updatedOrder, customer, cook, rider);
    }

    private void validateStateTransition(OrderStatus current, OrderStatus next) {
        // State Machine validation definitions
        if (next == OrderStatus.CANCELLED) {
            if (current == OrderStatus.READY || current == OrderStatus.DELIVERING || current == OrderStatus.DELIVERED) {
                throw new IllegalArgumentException("Cannot cancel an order that is already prepared or en route");
            }
            return;
        }

        switch (current) {
            case PLACED:
                if (next != OrderStatus.ACCEPTED) {
                    throw new IllegalArgumentException("Pending orders must first be accepted by the cook");
                }
                break;
            case ACCEPTED:
                if (next != OrderStatus.PREPARING) {
                    throw new IllegalArgumentException("Accepted orders must transition to the preparing queue next");
                }
                break;
            case PREPARING:
                if (next != OrderStatus.READY) {
                    throw new IllegalArgumentException("Preparing meals must transition to a ready state before dispatch");
                }
                break;
            case READY:
                if (next != OrderStatus.DELIVERING && next != OrderStatus.DELIVERED) {
                    throw new IllegalArgumentException("Ready orders can transition to dispatch delivery or immediate self-pickup");
                }
                break;
            case DELIVERING:
                if (next != OrderStatus.DELIVERED) {
                    throw new IllegalArgumentException("Transit orders can only transition to a completed delivered state");
                }
                break;
            case DELIVERED:
                throw new IllegalArgumentException("Completed orders cannot transition to new states");
            default:
                throw new IllegalArgumentException("Invalid state transition trigger from: " + current + " to: " + next);
        }
    }

    private String generateOrderNumber() {
        String datePrefix = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int randomCode = 1000 + random.nextInt(9000);
        return "NP-" + datePrefix + "-" + randomCode;
    }

    public OrderResponse mapToOrderResponse(Order order, User customer, User cook, User rider) {
        String custName = customer != null && customer.getProfile() != null ? customer.getProfile().getName() : "Customer";
        String cookName = cook != null && cook.getProfile() != null ? cook.getProfile().getName() : "Home Cook";
        String riderName = rider != null && rider.getProfile() != null ? rider.getProfile().getName() : null;
        String custPhone = customer != null && customer.getProfile() != null ? customer.getProfile().getPhone() : null;
        String cookPhone = cook != null && cook.getProfile() != null ? cook.getProfile().getPhone() : null;
        String cookAddress = cookName + "'s Kitchen";
        List<Double> cookCoords = cook != null && cook.getProfile() != null && cook.getProfile().getLocation() != null 
                ? cook.getProfile().getLocation().getCoordinates() : null;

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomerId(),
                custName,
                order.getCookId(),
                cookName,
                order.getItems(),
                order.getTotalAmount(),
                order.getPlatformFee(),
                order.getCookEarnings(),
                order.getStatus().name(),
                order.getStatusHistory(),
                order.getDeliveryMethod(),
                order.getAddress(),
                order.getScheduledFor(),
                order.getSpecialInstructions(),
                order.getPaymentTransactionId(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getRiderId(),
                riderName,
                order.getRiderEarnings(),
                order.getPickedUpAt(),
                order.getDeliveredAt(),
                custPhone,
                cookPhone,
                cookAddress,
                cookCoords
        );
    }

    public OrderResponse mapToOrderResponse(Order order, String customerName, String cookName, String riderName) {
        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomerId(),
                customerName,
                order.getCookId(),
                cookName,
                order.getItems(),
                order.getTotalAmount(),
                order.getPlatformFee(),
                order.getCookEarnings(),
                order.getStatus().name(),
                order.getStatusHistory(),
                order.getDeliveryMethod(),
                order.getAddress(),
                order.getScheduledFor(),
                order.getSpecialInstructions(),
                order.getPaymentTransactionId(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getRiderId(),
                riderName,
                order.getRiderEarnings(),
                order.getPickedUpAt(),
                order.getDeliveredAt(),
                null,
                null,
                null,
                null
        );
    }

    public OrderResponse reportDispute(String orderId, String customerEmail, com.neighborplates.dto.request.ReportDisputeRequest request) {
        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (!order.getCustomerId().equals(customer.getId())) {
            throw new UnauthorizedException("You can only report disputes for your own orders");
        }

        order.setDisputed(true);
        order.setDisputeReason(request.getReason() + (request.getDetails() != null && !request.getDetails().isBlank() ? ": " + request.getDetails() : ""));
        order.setDisputeStatus("OPEN");
        order.setDisputeReportedAt(Instant.now());
        order.setUpdatedAt(Instant.now());

        Order saved = orderRepository.save(order);

        User cook = userRepository.findById(saved.getCookId()).orElse(null);
        User rider = saved.getRiderId() != null ? userRepository.findById(saved.getRiderId()).orElse(null) : null;

        // Notify admins / real-time trigger
        firebaseNotificationService.updateOrderTrackingStatus(saved.getId(), "DISPUTED");

        return mapToOrderResponse(
                saved,
                customer.getProfile() != null ? customer.getProfile().getName() : "Customer",
                cook != null && cook.getProfile() != null ? cook.getProfile().getName() : "Cook",
                rider != null && rider.getProfile() != null ? rider.getProfile().getName() : null
        );
    }
}
