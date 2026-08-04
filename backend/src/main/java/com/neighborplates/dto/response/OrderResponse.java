package com.neighborplates.dto.response;

import com.neighborplates.model.Order;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private String id;
    private String orderNumber;
    private String customerId;
    private String customerName;
    private String cookId;
    private String cookName;
    private List<Order.OrderItem> items;
    private double totalAmount;
    private double platformFee;
    private double cookEarnings;
    private String status;
    private List<Order.StatusHistoryItem> statusHistory;
    private String deliveryMethod;
    private Order.DeliveryAddress address;
    private Instant scheduledFor;
    private String specialInstructions;
    private String paymentTransactionId;
    private Instant createdAt;
    private Instant updatedAt;
}
