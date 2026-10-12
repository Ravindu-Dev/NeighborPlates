package com.neighborplates.service;

import com.neighborplates.dto.request.VehicleRequest;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import com.neighborplates.model.Vehicle;
import com.neighborplates.model.enums.OrderStatus;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.UserRepository;
import com.neighborplates.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public VehicleService(VehicleRepository vehicleRepository,
                          UserRepository userRepository,
                          OrderRepository orderRepository) {
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    private User getAuthenticatedRider(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != UserRole.RIDER) {
            throw new UnauthorizedException("Only riders can manage vehicles");
        }
        return user;
    }

    public List<Vehicle> getRiderVehicles(String email) {
        User rider = getAuthenticatedRider(email);
        List<Vehicle> vehicles = vehicleRepository.findByRiderIdAndActiveTrueOrderByCreatedAtDesc(rider.getId());

        // Auto-migrate legacy vehicle from rider profile if no vehicle entities exist yet
        if (vehicles.isEmpty() && rider.getProfile() != null &&
                (rider.getProfile().getVehicleModel() != null || rider.getProfile().getVehiclePlate() != null)) {
            String type = rider.getProfile().getVehicleType() != null ? rider.getProfile().getVehicleType() : "E-Bike";
            String model = rider.getProfile().getVehicleModel() != null ? rider.getProfile().getVehicleModel() : "Primary Delivery Vehicle";
            String plate = rider.getProfile().getVehiclePlate() != null ? rider.getProfile().getVehiclePlate() : "#NP-RIDER-1";

            Vehicle initialVehicle = Vehicle.builder()
                    .riderId(rider.getId())
                    .vehicleType(type)
                    .makeModel(model)
                    .plateNumber(plate)
                    .color("Standard")
                    .isPrimary(true)
                    .active(true)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            vehicleRepository.save(initialVehicle);
            vehicles = List.of(initialVehicle);
        }

        return vehicles;
    }

    public Vehicle createVehicle(String email, VehicleRequest request) {
        User rider = getAuthenticatedRider(email);
        String plate = request.getPlateNumber().trim();

        if (vehicleRepository.existsByRiderIdAndPlateNumberIgnoreCaseAndActiveTrue(rider.getId(), plate)) {
            throw new IllegalArgumentException("A vehicle with plate number " + plate + " is already registered to your account.");
        }

        List<Vehicle> currentVehicles = vehicleRepository.findByRiderIdAndActiveTrueOrderByCreatedAtDesc(rider.getId());
        boolean shouldBePrimary = currentVehicles.isEmpty() || Boolean.TRUE.equals(request.getIsPrimary());

        if (shouldBePrimary) {
            for (Vehicle v : currentVehicles) {
                if (Boolean.TRUE.equals(v.getIsPrimary())) {
                    v.setIsPrimary(false);
                    v.setUpdatedAt(Instant.now());
                    vehicleRepository.save(v);
                }
            }
        }

        Vehicle vehicle = Vehicle.builder()
                .riderId(rider.getId())
                .vehicleType(request.getVehicleType().trim())
                .makeModel(request.getMakeModel().trim())
                .plateNumber(plate)
                .color(request.getColor() != null ? request.getColor().trim() : null)
                .year(request.getYear())
                .isPrimary(shouldBePrimary)
                .active(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Vehicle saved = vehicleRepository.save(vehicle);

        if (shouldBePrimary) {
            syncProfileWithPrimary(rider, saved);
        }

        return saved;
    }

    public Vehicle updateVehicle(String email, String vehicleId, VehicleRequest request) {
        User rider = getAuthenticatedRider(email);
        Vehicle vehicle = vehicleRepository.findByIdAndRiderId(vehicleId, rider.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found or does not belong to you"));

        if (!Boolean.TRUE.equals(vehicle.getActive())) {
            throw new ResourceNotFoundException("Vehicle not found or has been deactivated");
        }

        String plate = request.getPlateNumber().trim();
        if (!plate.equalsIgnoreCase(vehicle.getPlateNumber()) &&
                vehicleRepository.existsByRiderIdAndPlateNumberIgnoreCaseAndActiveTrue(rider.getId(), plate)) {
            throw new IllegalArgumentException("A vehicle with plate number " + plate + " is already registered to your account.");
        }

        vehicle.setVehicleType(request.getVehicleType().trim());
        vehicle.setMakeModel(request.getMakeModel().trim());
        vehicle.setPlateNumber(plate);
        vehicle.setColor(request.getColor() != null ? request.getColor().trim() : null);
        vehicle.setYear(request.getYear());

        boolean makePrimary = Boolean.TRUE.equals(request.getIsPrimary());
        if (makePrimary && !Boolean.TRUE.equals(vehicle.getIsPrimary())) {
            List<Vehicle> others = vehicleRepository.findByRiderIdAndActiveTrueOrderByCreatedAtDesc(rider.getId());
            for (Vehicle v : others) {
                if (!v.getId().equals(vehicle.getId()) && Boolean.TRUE.equals(v.getIsPrimary())) {
                    v.setIsPrimary(false);
                    v.setUpdatedAt(Instant.now());
                    vehicleRepository.save(v);
                }
            }
            vehicle.setIsPrimary(true);
        }

        vehicle.setUpdatedAt(Instant.now());
        Vehicle saved = vehicleRepository.save(vehicle);

        if (Boolean.TRUE.equals(saved.getIsPrimary())) {
            syncProfileWithPrimary(rider, saved);
        }

        return saved;
    }

    public Vehicle setPrimaryVehicle(String email, String vehicleId) {
        User rider = getAuthenticatedRider(email);
        Vehicle vehicle = vehicleRepository.findByIdAndRiderId(vehicleId, rider.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found or does not belong to you"));

        if (!Boolean.TRUE.equals(vehicle.getActive())) {
            throw new ResourceNotFoundException("Vehicle not found or has been deactivated");
        }

        List<Vehicle> all = vehicleRepository.findByRiderIdAndActiveTrueOrderByCreatedAtDesc(rider.getId());
        for (Vehicle v : all) {
            boolean isTarget = v.getId().equals(vehicleId);
            if (Boolean.TRUE.equals(v.getIsPrimary()) != isTarget) {
                v.setIsPrimary(isTarget);
                v.setUpdatedAt(Instant.now());
                vehicleRepository.save(v);
            }
        }

        vehicle.setIsPrimary(true);
        vehicle.setUpdatedAt(Instant.now());
        Vehicle saved = vehicleRepository.save(vehicle);

        syncProfileWithPrimary(rider, saved);
        return saved;
    }

    public ApiResponse deleteVehicle(String email, String vehicleId) {
        User rider = getAuthenticatedRider(email);
        Vehicle vehicle = vehicleRepository.findByIdAndRiderId(vehicleId, rider.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found or does not belong to you"));

        if (!Boolean.TRUE.equals(vehicle.getActive())) {
            return new ApiResponse(true, "Vehicle already removed");
        }

        // Safety verification: Prevent deletion of primary vehicle during active delivery
        if (Boolean.TRUE.equals(vehicle.getIsPrimary())) {
            List<Order> activeOrders = orderRepository.findByRiderIdOrderByCreatedAtDesc(rider.getId())
                    .stream()
                    .filter(o -> o.getStatus() == OrderStatus.READY || o.getStatus() == OrderStatus.DELIVERING)
                    .toList();

            if (!activeOrders.isEmpty()) {
                throw new IllegalStateException("Cannot remove your active delivery vehicle while you have deliveries in progress.");
            }
        }

        // Soft delete for audit compliance and delivery historical record integrity
        vehicle.setActive(false);
        vehicle.setIsPrimary(false);
        vehicle.setUpdatedAt(Instant.now());
        vehicleRepository.save(vehicle);

        // If the deleted vehicle was primary, promote another active vehicle if one exists
        List<Vehicle> remaining = vehicleRepository.findByRiderIdAndActiveTrueOrderByCreatedAtDesc(rider.getId());
        if (!remaining.isEmpty()) {
            boolean hasPrimary = remaining.stream().anyMatch(v -> Boolean.TRUE.equals(v.getIsPrimary()));
            if (!hasPrimary) {
                Vehicle newPrimary = remaining.get(0);
                newPrimary.setIsPrimary(true);
                newPrimary.setUpdatedAt(Instant.now());
                vehicleRepository.save(newPrimary);
                syncProfileWithPrimary(rider, newPrimary);
            }
        } else {
            // No vehicles remaining
            if (rider.getProfile() != null) {
                rider.getProfile().setVehicleType(null);
                rider.getProfile().setVehicleModel(null);
                rider.getProfile().setVehiclePlate(null);
                rider.setUpdatedAt(Instant.now());
                userRepository.save(rider);
            }
        }

        return new ApiResponse(true, "Vehicle removed successfully");
    }

    private void syncProfileWithPrimary(User rider, Vehicle vehicle) {
        if (rider.getProfile() == null) {
            rider.setProfile(new User.UserProfile());
        }
        rider.getProfile().setVehicleType(vehicle.getVehicleType());
        rider.getProfile().setVehicleModel(vehicle.getMakeModel());
        rider.getProfile().setVehiclePlate(vehicle.getPlateNumber());
        rider.setUpdatedAt(Instant.now());
        userRepository.save(rider);
    }
}
