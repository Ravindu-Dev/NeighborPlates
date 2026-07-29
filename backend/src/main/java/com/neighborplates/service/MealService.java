package com.neighborplates.service;

import com.neighborplates.dto.request.CreateMealRequest;
import com.neighborplates.dto.response.MealResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.Meal;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.MealCategory;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.MealRepository;
import com.neighborplates.repository.UserRepository;
import com.neighborplates.util.GeoUtils;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MealService {

    private final MealRepository mealRepository;
    private final UserRepository userRepository;

    public MealService(MealRepository mealRepository, UserRepository userRepository) {
        this.mealRepository = mealRepository;
        this.userRepository = userRepository;
    }

    public MealResponse createMeal(String cookEmail, CreateMealRequest request) {
        User cook = userRepository.findByEmail(cookEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Cook not found"));

        if (cook.getRole() != UserRole.COOK) {
            throw new UnauthorizedException("Only registered cooks can create meal listings");
        }

        Meal meal = new Meal();
        meal.setCookId(cook.getId());
        meal.setName(request.getName());
        meal.setDescription(request.getDescription());
        meal.setPhotos(request.getPhotos() != null ? request.getPhotos() : new ArrayList<>());
        meal.setPrice(request.getPrice());
        meal.setCategory(request.getCategory());
        meal.setCuisineType(request.getCuisineType());
        meal.setIngredients(request.getIngredients() != null ? request.getIngredients() : new ArrayList<>());
        meal.setAllergenTags(request.getAllergenTags() != null ? request.getAllergenTags() : new ArrayList<>());
        meal.setPortionLimit(request.getPortionLimit());
        meal.setPortionsRemaining(request.getPortionLimit());

        Meal.MealAvailability availability = new Meal.MealAvailability();
        availability.setDays(request.getAvailability().getDays() != null ? request.getAvailability().getDays() : new ArrayList<>());
        availability.setCutoffTime(request.getAvailability().getCutoffTime());
        availability.setServingTime(request.getAvailability().getServingTime());
        meal.setAvailability(availability);

        meal.setActive(true);
        meal.setRecentReviews(new ArrayList<>());
        meal.setAvgRating(0.0);
        meal.setTotalOrders(0);
        meal.setCreatedAt(Instant.now());
        meal.setUpdatedAt(Instant.now());

        Meal savedMeal = mealRepository.save(meal);
        return mapToMealResponse(savedMeal, cook.getProfile().getName());
    }

    public MealResponse updateMeal(String cookEmail, String mealId, CreateMealRequest request) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));

        User cook = userRepository.findByEmail(cookEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Cook not found"));

        if (!meal.getCookId().equals(cook.getId())) {
            throw new UnauthorizedException("You are not authorized to edit this meal listing");
        }

        meal.setName(request.getName());
        meal.setDescription(request.getDescription());
        if (request.getPhotos() != null) {
            meal.setPhotos(request.getPhotos());
        }
        meal.setPrice(request.getPrice());
        meal.setCategory(request.getCategory());
        meal.setCuisineType(request.getCuisineType());
        meal.setIngredients(request.getIngredients() != null ? request.getIngredients() : new ArrayList<>());
        meal.setAllergenTags(request.getAllergenTags() != null ? request.getAllergenTags() : new ArrayList<>());
        
        // Reset limits if portion limit changes
        if (meal.getPortionLimit() != request.getPortionLimit()) {
            meal.setPortionLimit(request.getPortionLimit());
            meal.setPortionsRemaining(request.getPortionLimit());
        }

        Meal.MealAvailability availability = meal.getAvailability();
        availability.setDays(request.getAvailability().getDays() != null ? request.getAvailability().getDays() : new ArrayList<>());
        availability.setCutoffTime(request.getAvailability().getCutoffTime());
        availability.setServingTime(request.getAvailability().getServingTime());

        meal.setUpdatedAt(Instant.now());

        Meal updatedMeal = mealRepository.save(meal);
        return mapToMealResponse(updatedMeal, cook.getProfile().getName());
    }

    public void deactivateMeal(String cookEmail, String mealId) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));

        User cook = userRepository.findByEmail(cookEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Cook not found"));

        if (!meal.getCookId().equals(cook.getId())) {
            throw new UnauthorizedException("You are not authorized to edit this meal listing");
        }

        meal.setActive(false);
        meal.setUpdatedAt(Instant.now());
        mealRepository.save(meal);
    }

    public MealResponse getMealById(String id) {
        Meal meal = mealRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));

        User cook = userRepository.findById(meal.getCookId())
                .orElseThrow(() -> new ResourceNotFoundException("Cook associated with this meal not found"));

        return mapToMealResponse(meal, cook.getProfile().getName());
    }

    public List<MealResponse> getMealsByCook(String cookId) {
        User cook = userRepository.findById(cookId)
                .orElseThrow(() -> new ResourceNotFoundException("Cook not found"));

        return mealRepository.findByCookId(cookId).stream()
                .map(meal -> mapToMealResponse(meal, cook.getProfile().getName()))
                .collect(Collectors.toList());
    }

    public List<MealResponse> getAllMeals(String category, Double customerLon, Double customerLat, Double maxDistanceKm) {
        List<Meal> activeMeals;

        if (category != null && !category.trim().isEmpty()) {
            try {
                MealCategory mealCategory = MealCategory.valueOf(category.toUpperCase());
                activeMeals = mealRepository.findByActiveTrueAndCategory(mealCategory);
            } catch (IllegalArgumentException ex) {
                activeMeals = mealRepository.findByActiveTrue();
            }
        } else {
            activeMeals = mealRepository.findByActiveTrue();
        }

        List<MealResponse> responses = new ArrayList<>();

        for (Meal meal : activeMeals) {
            User cook = userRepository.findById(meal.getCookId()).orElse(null);
            if (cook == null) continue;

            // Geospatial Haversine validation filter
            if (customerLon != null && customerLat != null && maxDistanceKm != null) {
                User.UserProfile cookProfile = cook.getProfile();
                if (cookProfile.getLocation() != null && cookProfile.getLocation().getCoordinates().size() == 2) {
                    double cookLon = cookProfile.getLocation().getCoordinates().get(0);
                    double cookLat = cookProfile.getLocation().getCoordinates().get(1);

                    double distance = GeoUtils.calculateDistance(customerLon, customerLat, cookLon, cookLat);
                    if (distance > maxDistanceKm) {
                        continue; // Skip: outside target filter range
                    }
                } else {
                    continue; // Skip: location details missing
                }
            }

            responses.add(mapToMealResponse(meal, cook.getProfile().getName()));
        }

        return responses;
    }

    private MealResponse mapToMealResponse(Meal meal, String cookName) {
        return new MealResponse(
                meal.getId(),
                meal.getCookId(),
                cookName,
                meal.getName(),
                meal.getDescription(),
                meal.getPhotos(),
                meal.getPrice(),
                meal.getCategory().name(),
                meal.getCuisineType(),
                meal.getIngredients(),
                meal.getAllergenTags(),
                meal.getPortionLimit(),
                meal.getPortionsRemaining(),
                meal.getAvailability(),
                meal.getRecentReviews(),
                meal.getAvgRating(),
                meal.getTotalOrders(),
                meal.isActive(),
                meal.getCreatedAt()
        );
    }
}
