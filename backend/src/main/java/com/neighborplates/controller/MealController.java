package com.neighborplates.controller;

import com.neighborplates.dto.request.CreateMealRequest;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.dto.response.MealResponse;
import com.neighborplates.service.MealService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/meals")
public class MealController {

    private final MealService mealService;

    public MealController(MealService mealService) {
        this.mealService = mealService;
    }

    @PostMapping
    public ResponseEntity<MealResponse> createMeal(@Valid @RequestBody CreateMealRequest request, Principal principal) {
        MealResponse response = mealService.createMeal(principal.getName(), request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MealResponse> updateMeal(@PathVariable String id, @Valid @RequestBody CreateMealRequest request, Principal principal) {
        MealResponse response = mealService.updateMeal(principal.getName(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deactivateMeal(@PathVariable String id, Principal principal) {
        mealService.deactivateMeal(principal.getName(), id);
        return ResponseEntity.ok(new ApiResponse(true, "Meal deactivation successful"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MealResponse> getMealById(@PathVariable String id) {
        MealResponse response = mealService.getMealById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cook/{cookId}")
    public ResponseEntity<List<MealResponse>> getMealsByCook(@PathVariable String cookId) {
        List<MealResponse> response = mealService.getMealsByCook(cookId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<MealResponse>> getAllMeals(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double maxDistance) {
        List<MealResponse> response = mealService.getAllMeals(category, longitude, latitude, maxDistance);
        return ResponseEntity.ok(response);
    }
}
