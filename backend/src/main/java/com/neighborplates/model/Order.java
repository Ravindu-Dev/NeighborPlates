package com.neighborplates.model;

import com.neighborplates.model.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "orders")
public class Order {

    @Id
    private String id;

    @Indexed(unique = true)
    private String orderNumber; // "NP-yyyyMMdd-xxxx"

    private String customerId;

    private String cookId;

    private List<OrderItem> items = new ArrayList<>();

    private double totalAmount;

    private double platformFee;

    private double cookEarnings;

    private OrderStatus status = OrderStatus.PLACED;

    private List<StatusHistoryItem> statusHistory = new ArrayList<>();

    private String deliveryMethod; // "PICKUP", "COOK_DELIVERY", "RIDER"

    private DeliveryAddress address;

    private Instant scheduledFor; // Target delivery/pickup time

    private String specialInstructions;

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    @Indexed(expireAfterSeconds = 7776000) // TTL index: auto-delete after 90 days (90 * 24 * 3600 seconds)
    private Instant ttlExpiryDate;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItem {
        private String mealId;
        private String name;
        private double price;
        private int quantity;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusHistoryItem {
        private OrderStatus status;
        private Instant timestamp = Instant.now();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryAddress {
        private String label;
        private List<Double> coordinates = new ArrayList<>(); // [longitude, latitude]
    }
}
