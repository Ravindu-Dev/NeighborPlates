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

    public static List<Double> getDefaultCoordinatesForArea(String town, String district) {
        if (town != null) {
            String t = town.trim().toLowerCase();
            if (t.contains("peradeniya")) return List.of(80.5975, 7.2600);
            if (t.contains("kandy")) return List.of(80.6337, 7.2906);
            if (t.contains("katugastota")) return List.of(80.6186, 7.3245);
            if (t.contains("gampola")) return List.of(80.5694, 7.1643);
            if (t.contains("kundasale")) return List.of(80.6865, 7.2842);
            if (t.contains("digana")) return List.of(80.7300, 7.3000);
            if (t.contains("kurunegala")) return List.of(80.3623, 7.4863);
            if (t.contains("galle")) return List.of(80.2210, 6.0535);
            if (t.contains("matara")) return List.of(80.5550, 5.9549);
            if (t.contains("jaffna")) return List.of(80.0255, 9.6615);
            if (t.contains("anuradhapura")) return List.of(80.4037, 8.3114);
            if (t.contains("badulla")) return List.of(81.0550, 6.9934);
            if (t.contains("nuwara eliya")) return List.of(80.7891, 6.9497);
            if (t.contains("ratnapura")) return List.of(80.4000, 6.6828);
            if (t.contains("negombo")) return List.of(79.8736, 7.2008);
            if (t.contains("gampaha")) return List.of(79.9990, 7.0840);
            if (t.contains("kalutara")) return List.of(79.9607, 6.5854);
            if (t.contains("panadura")) return List.of(79.9074, 6.7131);
        }
        if (district != null) {
            String d = district.trim().toLowerCase();
            if (d.contains("kandy")) return List.of(80.6337, 7.2906);
            if (d.contains("kurunegala")) return List.of(80.3623, 7.4863);
            if (d.contains("galle")) return List.of(80.2210, 6.0535);
            if (d.contains("matara")) return List.of(80.5550, 5.9549);
            if (d.contains("jaffna")) return List.of(80.0255, 9.6615);
            if (d.contains("anuradhapura")) return List.of(80.4037, 8.3114);
            if (d.contains("badulla")) return List.of(81.0550, 6.9934);
            if (d.contains("nuwara eliya")) return List.of(80.7891, 6.9497);
            if (d.contains("ratnapura")) return List.of(80.4000, 6.6828);
            if (d.contains("gampaha")) return List.of(79.9990, 7.0840);
            if (d.contains("kalutara")) return List.of(79.9607, 6.5854);
        }
        return List.of(79.8612, 6.9271); // Default Colombo [lon, lat]
    }

    public User getOwnProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));
        if (user.getProfile() != null) {
            User.UserProfile p = user.getProfile();
            if (p.getLocation() == null || p.getLocation().getCoordinates() == null || p.getLocation().getCoordinates().isEmpty()
                    || (p.getLocation().getCoordinates().get(0) == 0.0 && p.getLocation().getCoordinates().get(1) == 0.0)) {
                if (p.getTown() != null || p.getDistrict() != null) {
                    User.GeoJsonPoint pt = new User.GeoJsonPoint();
                    pt.setType("Point");
                    pt.setCoordinates(new ArrayList<>(getDefaultCoordinatesForArea(p.getTown(), p.getDistrict())));
                    p.setLocation(pt);
                    user = userRepository.save(user);
                }
            }
        }
        return user;
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
        } else if (current.getLocation() == null || current.getLocation().getCoordinates() == null || current.getLocation().getCoordinates().isEmpty()
                || (current.getLocation().getCoordinates().get(0) == 0.0 && current.getLocation().getCoordinates().get(1) == 0.0)) {
            User.GeoJsonPoint point = new User.GeoJsonPoint();
            point.setType("Point");
            point.setCoordinates(new ArrayList<>(getDefaultCoordinatesForArea(current.getTown(), current.getDistrict())));
            current.setLocation(point);
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
