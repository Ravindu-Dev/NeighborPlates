package com.neighborplates.controller;

import com.neighborplates.dto.request.VehicleRequest;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.dto.response.RiderSummaryResponse;
import com.neighborplates.model.User;
import com.neighborplates.model.Vehicle;
import com.neighborplates.service.RiderService;
import com.neighborplates.service.UserService;
import com.neighborplates.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/riders")
public class RiderController {

    private final UserService userService;
    private final RiderService riderService;
    private final VehicleService vehicleService;

    public RiderController(UserService userService, RiderService riderService, VehicleService vehicleService) {
        this.userService = userService;
        this.riderService = riderService;
        this.vehicleService = vehicleService;
    }

    @PutMapping("/availability")
    public ResponseEntity<User> toggleAvailability(
            @RequestParam boolean isAvailable,
            Principal principal) {
        User user = userService.toggleRiderAvailability(principal.getName(), isAvailable);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/summary")
    public ResponseEntity<RiderSummaryResponse> getSummary(Principal principal) {
        RiderSummaryResponse summary = riderService.getRiderSummary(principal.getName());
        return ResponseEntity.ok(summary);
    }

    // --- Rider Vehicle Management CRUD ---

    @GetMapping("/vehicles")
    public ResponseEntity<List<Vehicle>> getRiderVehicles(Principal principal) {
        List<Vehicle> vehicles = vehicleService.getRiderVehicles(principal.getName());
        return ResponseEntity.ok(vehicles);
    }

    @PostMapping("/vehicles")
    public ResponseEntity<Vehicle> createVehicle(
            @Valid @RequestBody VehicleRequest request,
            Principal principal) {
        Vehicle vehicle = vehicleService.createVehicle(principal.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(vehicle);
    }

    @PutMapping("/vehicles/{id}")
    public ResponseEntity<Vehicle> updateVehicle(
            @PathVariable String id,
            @Valid @RequestBody VehicleRequest request,
            Principal principal) {
        Vehicle vehicle = vehicleService.updateVehicle(principal.getName(), id, request);
        return ResponseEntity.ok(vehicle);
    }

    @PutMapping("/vehicles/{id}/primary")
    public ResponseEntity<Vehicle> setPrimaryVehicle(
            @PathVariable String id,
            Principal principal) {
        Vehicle vehicle = vehicleService.setPrimaryVehicle(principal.getName(), id);
        return ResponseEntity.ok(vehicle);
    }

    @DeleteMapping("/vehicles/{id}")
    public ResponseEntity<ApiResponse> deleteVehicle(
            @PathVariable String id,
            Principal principal) {
        ApiResponse response = vehicleService.deleteVehicle(principal.getName(), id);
        return ResponseEntity.ok(response);
    }

    // --- Safe Rider Account Lifecycle / Deactivation ---

    @PutMapping("/deactivate")
    public ResponseEntity<ApiResponse> deactivateAccount(Principal principal) {
        riderService.deactivateRiderAccount(principal.getName());
        return ResponseEntity.ok(new ApiResponse(true, "Rider account has been deactivated successfully."));
    }

    @PutMapping("/reactivate")
    public ResponseEntity<ApiResponse> reactivateAccount(Principal principal) {
        riderService.reactivateRiderAccount(principal.getName());
        return ResponseEntity.ok(new ApiResponse(true, "Rider account has been reactivated successfully."));
    }
}
