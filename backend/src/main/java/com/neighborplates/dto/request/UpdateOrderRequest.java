package com.neighborplates.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrderRequest {

    private String specialInstructions;

    private PlaceOrderRequest.DeliveryAddressDto address;

    private String deliveryMethod; // "PICKUP", "COOK_DELIVERY", "RIDER"

    private Instant scheduledFor;
}
