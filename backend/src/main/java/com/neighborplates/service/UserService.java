package com.neighborplates.service;

import com.neighborplates.dto.request.ChangePasswordRequest;
import com.neighborplates.dto.response.FavoriteToggleResponse;
import com.neighborplates.dto.response.MealResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.MealRepository;
import com.neighborplates.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final MealRepository mealRepository;
    private final MealService mealService;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       MealRepository mealRepository,
                       MealService mealService,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.mealRepository = mealRepository;
        this.mealService = mealService;
        this.passwordEncoder = passwordEncoder;
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

    public FavoriteToggleResponse toggleFavorite(String email, String mealId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        if (!mealRepository.existsById(mealId)) {
            throw new ResourceNotFoundException("Meal not found");
        }

        List<String> favorites = user.getFavorites();
        if (favorites == null) {
            favorites = new ArrayList<>();
            user.setFavorites(favorites);
        }

        boolean favorited;
        if (favorites.contains(mealId)) {
            favorites.remove(mealId);
            favorited = false;
        } else {
            favorites.add(mealId);
            favorited = true;
        }

        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        return new FavoriteToggleResponse(favorited, mealId, favorites);
    }

    public List<MealResponse> getFavoriteMeals(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        List<String> favorites = user.getFavorites();
        if (favorites == null || favorites.isEmpty()) {
            return new ArrayList<>();
        }

        return mealService.getMealsByIds(favorites);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }
}
