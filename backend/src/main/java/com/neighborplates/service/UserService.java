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
        current.setName(update.getName());
        current.setPhone(update.getPhone());
        current.setBio(update.getBio());
        current.setAvatarUrl(update.getAvatarUrl());
        current.setKitchenPhotos(update.getKitchenPhotos());
        current.setDeliveryRadius(update.getDeliveryRadius());
        if (update.getVehicleType() != null) {
            current.setVehicleType(update.getVehicleType());
        }

        if (update.getLocation() != null && update.getLocation().getCoordinates().size() == 2) {
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
