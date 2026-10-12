package com.neighborplates.controller;

import com.neighborplates.dto.request.PlaceOrderRequest;
import com.neighborplates.dto.request.ReportDisputeRequest;
import com.neighborplates.dto.request.UpdateOrderRequest;
import com.neighborplates.dto.response.ApiResponse;
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

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable String id, Principal principal) {
        OrderResponse response = orderService.getOrderById(principal.getName(), id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrderResponse> updateOrder(
            @PathVariable String id,
            @RequestBody UpdateOrderRequest request,
            Principal principal) {
        OrderResponse response = orderService.updateOrder(principal.getName(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/delivered")
    public ResponseEntity<ApiResponse> deleteAllDeliveredOrders(Principal principal) {
        int count = orderService.deleteAllDeliveredOrders(principal.getName());
        return ResponseEntity.ok(new ApiResponse(true, "Successfully deleted " + count + " delivered orders"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteOrder(
            @PathVariable String id,
            Principal principal) {
        orderService.deleteOrder(principal.getName(), id);
        return ResponseEntity.ok(new ApiResponse(true, "Order deleted successfully"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status,
            Principal principal) {
        OrderResponse response = orderService.updateOrderStatus(principal.getName(), id, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/available")
    public ResponseEntity<List<OrderResponse>> getAvailableOrders() {
        List<OrderResponse> response = orderService.getAvailableOrdersForRiders();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/rider-accept")
    public ResponseEntity<OrderResponse> acceptOrderAsRider(
            @PathVariable String id,
            Principal principal) {
        OrderResponse response = orderService.acceptOrderAsRider(principal.getName(), id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/dispute")
    public ResponseEntity<OrderResponse> reportDispute(
            @PathVariable String id,
            @Valid @RequestBody ReportDisputeRequest request,
            Principal principal) {
        OrderResponse response = orderService.reportDispute(id, principal.getName(), request);
        return ResponseEntity.ok(response);
    }
}
