package com.neighborplates.service;

import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getOwnProfile(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));
    }

    public User updateProfile(String email, User.UserProfile update) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        User.UserProfile current = user.getProfile();
        if (update.getName() != null) current.setName(update.getName());
        if (update.getPhone() != null) current.setPhone(update.getPhone());
        if (update.getBio() != null) current.setBio(update.getBio());
        if (update.getDistrict() != null) current.setDistrict(update.getDistrict());
        if (update.getTown() != null) current.setTown(update.getTown());
        if (update.getAvatarUrl() != null) current.setAvatarUrl(update.getAvatarUrl());
        if (update.getKitchenPhotos() != null) current.setKitchenPhotos(update.getKitchenPhotos());
        if (update.getDeliveryRadius() != null) current.setDeliveryRadius(update.getDeliveryRadius());
        if (update.getVehicleType() != null) current.setVehicleType(update.getVehicleType());
        if (update.getVehicleModel() != null) current.setVehicleModel(update.getVehicleModel());
        if (update.getVehiclePlate() != null) current.setVehiclePlate(update.getVehiclePlate());
        if (update.getOnTimeRate() != null) current.setOnTimeRate(update.getOnTimeRate());
        if (update.getAcceptanceRate() != null) current.setAcceptanceRate(update.getAcceptanceRate());
        if (update.getHaccpCertified() != null) current.setHaccpCertified(update.getHaccpCertified());
        if (update.getThermalBackpack() != null) current.setThermalBackpack(update.getThermalBackpack());
        if (update.getSpillProofRack() != null) current.setSpillProofRack(update.getSpillProofRack());
        if (update.getHeatedWarmerPod() != null) current.setHeatedWarmerPod(update.getHeatedWarmerPod());
        if (update.getHotFoodPriority() != null) current.setHotFoodPriority(update.getHotFoodPriority());
        if (update.getAutoAcceptRush() != null) current.setAutoAcceptRush(update.getAutoAcceptRush());
        if (update.getNavigationApp() != null) current.setNavigationApp(update.getNavigationApp());
        if (update.getPayoutMethod() != null) current.setPayoutMethod(update.getPayoutMethod());
        if (update.getInsurancePolicy() != null) current.setInsurancePolicy(update.getInsurancePolicy());

        if (update.getLocation() != null && update.getLocation().getCoordinates() != null && update.getLocation().getCoordinates().size() == 2) {
            current.setLocation(update.getLocation());
        }

        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }

    public User toggleRiderAvailability(String email, boolean isAvailable) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        if (user.getRole() != UserRole.RIDER) {
            throw new UnauthorizedException("Only riders can toggle availability");
        }

        user.getProfile().setIsAvailable(isAvailable);
        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }

    public User getCookProfile(String cookId) {
        User cook = userRepository.findById(cookId)
                .orElseThrow(() -> new ResourceNotFoundException("Cook profile not found"));

        if (cook.getRole() != UserRole.COOK) {
            throw new IllegalArgumentException("Specified user is not registered as a cook");
        }

        return cook;
    }
}
