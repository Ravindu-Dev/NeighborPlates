package com.neighborplates.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlaceOrderRequest {

    @NotBlank(message = "Cook ID is required")
    private String cookId;

    @NotEmpty(message = "Order must contain at least one item")
    private List<OrderItemDto> items;

    @NotBlank(message = "Delivery method is required")
    private String deliveryMethod; // "PICKUP", "COOK_DELIVERY", "RIDER"

    @NotNull(message = "Delivery address is required")
    private DeliveryAddressDto address;

    private Instant scheduledFor; // Target preparation/delivery slot

    private String specialInstructions;

    private String paymentTransactionId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemDto {
        @NotBlank(message = "Meal ID is required")
        private String mealId;

        @Min(value = 1, message = "Quantity must be at least 1")
        private int quantity;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryAddressDto {
        @NotBlank(message = "Address label is required")
        private String label;
        private List<Double> coordinates; // [longitude, latitude]
    }
}
