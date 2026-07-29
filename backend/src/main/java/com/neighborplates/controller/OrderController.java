package com.neighborplates.controller;

import com.neighborplates.dto.request.PlaceOrderRequest;
import com.neighborplates.dto.response.OrderResponse;
import com.neighborplates.model.enums.OrderStatus;
import com.neighborplates.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(@Valid @RequestBody PlaceOrderRequest request, Principal principal) {
        OrderResponse response = orderService.placeOrder(principal.getName(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    public ResponseEntity<List<OrderResponse>> getMyOrders(Principal principal) {
        List<OrderResponse> response = orderService.getMyOrders(principal.getName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status,
            Principal principal) {
        OrderResponse response = orderService.updateOrderStatus(principal.getName(), id, status);
        return ResponseEntity.ok(response);
    }
}
