package com.neighborplates.controller;

import com.neighborplates.dto.request.CreateComboRequest;
import com.neighborplates.dto.response.MealResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.MealCategory;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.MealRepository;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.UserRepository;
import com.neighborplates.service.GeminiComboService;
import com.neighborplates.service.MealService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/combos")
public class ComboController {

    private final GeminiComboService geminiComboService;
    private final MealRepository mealRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final MealService mealService;

    public ComboController(GeminiComboService geminiComboService,
                           MealRepository mealRepository,
                           OrderRepository orderRepository,
                           UserRepository userRepository,
                           MealService mealService) {
        this.geminiComboService = geminiComboService;
        this.mealRepository = mealRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.mealService = mealService;
    }

    /**
     * Get AI-Powered combo deal recommendations tailored for the customer.
     * Guaranteed to never throw 500.
     */
    @GetMapping("/recommendations")
    public ResponseEntity<List<Map<String, Object>>> getCustomerComboRecommendations(Principal principal) {
        try {
            User customer = null;
            List<Order> customerOrders = new ArrayList<>();

            if (principal != null && principal.getName() != null) {
                customer = userRepository.findByEmail(principal.getName()).orElse(null);
                if (customer != null && customer.getId() != null) {
                    customerOrders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId());
                }
            }

            // Get all active combos
            List<Meal> activeCombos = mealRepository.findByActiveTrue().stream()
                    .filter(m -> m != null && m.isCombo() && m.getPortionsRemaining() > 0)
                    .collect(Collectors.toList());

            if (activeCombos.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            // Safely map all meals for reference without Collectors.toMap risk
            List<Meal> allMeals = mealRepository.findAll();
            Map<String, Meal> mealsById = new HashMap<>();
            for (Meal m : allMeals) {
                if (m != null && m.getId() != null) {
                    mealsById.put(m.getId(), m);
                }
            }

            // Call Gemini AI service
            List<Map<String, Object>> aiRecs;
            try {
                aiRecs = geminiComboService.recommendCombosForCustomer(
                        customer,
                        customerOrders,
                        activeCombos,
                        mealsById
                );
            } catch (Exception ex) {
                System.err.println("Gemini recommendation error (falling back): " + ex.getMessage());
                aiRecs = Collections.emptyList();
            }

            // If AI produced recommendations, enrich them
            List<Map<String, Object>> enrichedResults = new ArrayList<>();
            if (aiRecs != null && !aiRecs.isEmpty()) {
                for (Map<String, Object> rec : aiRecs) {
                    String comboId = (String) rec.get("comboId");
                    if (comboId != null) {
                        Meal comboMeal = mealsById.get(comboId);
                        if (comboMeal != null && comboMeal.isActive()) {
                            MealResponse mealResponse = safeGetMealResponse(comboMeal);

                            List<Map<String, Object>> includedMeals = getIncludedMealDetails(comboMeal, mealsById);

                            Map<String, Object> result = new HashMap<>();
                            result.put("combo", mealResponse);
                            result.put("includedMeals", includedMeals);
                            result.put("matchScore", rec.get("matchScore") != null ? rec.get("matchScore") : 95);
                            result.put("tag", rec.get("tag") != null ? rec.get("tag") : "🎯 AI Match");
                            result.put("reason", rec.get("reason") != null ? rec.get("reason") : comboMeal.getDescription());
                            double origPrice = comboMeal.getOriginalTotalPrice() > 0 ? comboMeal.getOriginalTotalPrice() : comboMeal.getPrice();
                            result.put("savings", Math.max(0, Math.round(origPrice - comboMeal.getPrice())));

                            enrichedResults.add(result);
                        }
                    }
                }
            }

            // If no enriched results produced, fallback to returning all active combos
            if (enrichedResults.isEmpty()) {
                for (Meal comboMeal : activeCombos) {
                    MealResponse mealResponse = safeGetMealResponse(comboMeal);
                    List<Map<String, Object>> includedMeals = getIncludedMealDetails(comboMeal, mealsById);

                    Map<String, Object> result = new HashMap<>();
                    result.put("combo", mealResponse);
                    result.put("includedMeals", includedMeals);
                    result.put("matchScore", 92);
                    result.put("tag", String.format("%.0f%% OFF BUNDLE", comboMeal.getDiscountPercentage() > 0 ? comboMeal.getDiscountPercentage() : 15.0));
                    result.put("reason", comboMeal.getDescription() != null ? comboMeal.getDescription() : "Special bundled home-cooked meal package!");
                    double origPrice = comboMeal.getOriginalTotalPrice() > 0 ? comboMeal.getOriginalTotalPrice() : comboMeal.getPrice();
                    result.put("savings", Math.max(0, Math.round(origPrice - comboMeal.getPrice())));

                    enrichedResults.add(result);
                }
            }

            return ResponseEntity.ok(enrichedResults);
        } catch (Exception e) {
            System.err.println("Fatal error in getCustomerComboRecommendations: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    private MealResponse safeGetMealResponse(Meal comboMeal) {
        try {
            return mealService.getMealById(comboMeal.getId());
        } catch (Exception e) {
            // Fallback manually construct MealResponse if Cook lookup fails
            MealResponse res = new MealResponse();
            res.setId(comboMeal.getId());
            res.setCookId(comboMeal.getCookId());
            res.setCookName("Home Chef");
            res.setName(comboMeal.getName());
            res.setDescription(comboMeal.getDescription());
            res.setPhotos(comboMeal.getPhotos());
            res.setPrice(comboMeal.getPrice());
            res.setCategory(comboMeal.getCategory() != null ? comboMeal.getCategory().name() : "COMBO");
            res.setCuisineType(comboMeal.getCuisineType());
            res.setIngredients(comboMeal.getIngredients());
            res.setAllergenTags(comboMeal.getAllergenTags());
            res.setPortionLimit(comboMeal.getPortionLimit());
            res.setPortionsRemaining(comboMeal.getPortionsRemaining());
            res.setAvailability(comboMeal.getAvailability());
            res.setRecentReviews(comboMeal.getRecentReviews());
            res.setAvgRating(comboMeal.getAvgRating());
            res.setTotalOrders(comboMeal.getTotalOrders());
            res.setActive(comboMeal.isActive());
            res.setCreatedAt(comboMeal.getCreatedAt());
            res.setCombo(true);
            res.setIncludedMealIds(comboMeal.getIncludedMealIds());
            res.setOriginalTotalPrice(comboMeal.getOriginalTotalPrice());
            res.setDiscountPercentage(comboMeal.getDiscountPercentage());
            return res;
        }
    }

    private List<Map<String, Object>> getIncludedMealDetails(Meal comboMeal, Map<String, Meal> mealsById) {
        List<Map<String, Object>> includedMeals = new ArrayList<>();
        if (comboMeal.getIncludedMealIds() != null) {
            for (String mId : comboMeal.getIncludedMealIds()) {
                Meal item = mealsById.get(mId);
                if (item != null) {
                    Map<String, Object> mInfo = new HashMap<>();
                    mInfo.put("id", item.getId());
                    mInfo.put("name", item.getName());
                    mInfo.put("price", item.getPrice());
                    mInfo.put("category", item.getCategory() != null ? item.getCategory().name() : "");
                    mInfo.put("photo", item.getPhotos() != null && !item.getPhotos().isEmpty() ? item.getPhotos().get(0) : null);
                    includedMeals.add(mInfo);
                }
            }
        }
        return includedMeals;
    }

    /**
     * Get all active combo deals across all kitchens
     */
    @GetMapping
    public ResponseEntity<List<MealResponse>> getAllActiveCombos() {
        try {
            List<Meal> activeCombos = mealRepository.findByActiveTrue().stream()
                    .filter(m -> m != null && m.isCombo())
                    .collect(Collectors.toList());

            List<MealResponse> responses = activeCombos.stream()
                    .map(this::safeGetMealResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("Error fetching active combos: " + e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * Create a combo deal (Cook action)
     */
    @PostMapping
    public ResponseEntity<MealResponse> createCombo(@Valid @RequestBody CreateComboRequest request, Principal principal) {
        User cook = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Cook not found"));

        if (cook.getRole() != UserRole.COOK) {
            throw new UnauthorizedException("Only cooks can create combo deals");
        }

        List<Meal> includedMeals = new ArrayList<>();
        double calculatedOriginalTotal = 0.0;
        List<String> combinedIngredients = new ArrayList<>();
        List<String> combinedPhotos = new ArrayList<>();

        if (request.getIncludedMealIds() != null && !request.getIncludedMealIds().isEmpty()) {
            for (String mealId : request.getIncludedMealIds()) {
                Meal meal = mealRepository.findById(mealId)
                        .orElseThrow(() -> new ResourceNotFoundException("Meal not found: " + mealId));
                if (!meal.getCookId().equals(cook.getId())) {
                    throw new UnauthorizedException("You can only include your own meals in a combo");
                }
                includedMeals.add(meal);
                calculatedOriginalTotal += meal.getPrice();
                if (meal.getIngredients() != null) {
                    combinedIngredients.addAll(meal.getIngredients());
                }
                if (meal.getPhotos() != null) {
                    combinedPhotos.addAll(meal.getPhotos());
                }
            }
        }

        double finalOriginalPrice = request.getOriginalTotalPrice() > 0 ? request.getOriginalTotalPrice() : (calculatedOriginalTotal > 0 ? calculatedOriginalTotal : (request.getPrice() != null ? request.getPrice() : 0.0));
        double finalPrice = request.getPrice() != null ? request.getPrice() : 0.0;
        double discountPercent = request.getDiscountPercentage() != null ? request.getDiscountPercentage() : 0.0;

        if (finalPrice <= 0 && discountPercent > 0) {
            finalPrice = Math.round(finalOriginalPrice * (1.0 - (discountPercent / 100.0)));
        } else if (discountPercent <= 0 && finalPrice > 0 && finalOriginalPrice > finalPrice) {
            discountPercent = Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100.0);
        }

        Meal combo = new Meal();
        combo.setCookId(cook.getId());
        combo.setName(request.getName());
        // Use provided description or auto-generate one
        String desc = request.getDescription();
        if (desc == null || desc.isBlank()) {
            desc = includedMeals.isEmpty()
                    ? "Delicious bundled package prepared fresh with special discounts!"
                    : "Special bundle deal including: " + includedMeals.stream().map(Meal::getName).collect(Collectors.joining(", ")) + ". Freshly made and bundled for extra savings!";
        }
        combo.setDescription(desc);
        
        List<String> photos = request.getPhotos() != null && !request.getPhotos().isEmpty()
                ? request.getPhotos()
                : combinedPhotos.stream().distinct().limit(3).collect(Collectors.toList());
        combo.setPhotos(photos);

        combo.setPrice(finalPrice);
        combo.setCategory(MealCategory.COMBO);
        combo.setCuisineType(request.getCuisineType() != null ? request.getCuisineType() : (!includedMeals.isEmpty() ? includedMeals.get(0).getCuisineType() : "Home-style"));
        combo.setIngredients(request.getIngredients() != null && !request.getIngredients().isEmpty()
                ? request.getIngredients()
                : combinedIngredients.stream().distinct().collect(Collectors.toList()));
        combo.setAllergenTags(request.getAllergenTags() != null ? request.getAllergenTags() : new ArrayList<>());
        combo.setPortionLimit(request.getPortionLimit() > 0 ? request.getPortionLimit() : 10);
        combo.setPortionsRemaining(combo.getPortionLimit());

        Meal.MealAvailability availability = new Meal.MealAvailability();
        if (request.getAvailability() != null) {
            availability.setDays(request.getAvailability().getDays() != null ? request.getAvailability().getDays() : new ArrayList<>());
            availability.setCutoffTime(request.getAvailability().getCutoffTime());
            availability.setServingTime(request.getAvailability().getServingTime());
        } else {
            availability.setDays(List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"));
            availability.setCutoffTime("11:00");
            availability.setServingTime("12:30");
        }
        combo.setAvailability(availability);

        combo.setCombo(true);
        combo.setIncludedMealIds(request.getIncludedMealIds());
        combo.setOriginalTotalPrice(finalOriginalPrice);
        combo.setDiscountPercentage(discountPercent);

        combo.setActive(true);
        combo.setRecentReviews(new ArrayList<>());
        combo.setAvgRating(0.0);
        combo.setTotalOrders(0);
        combo.setCreatedAt(Instant.now());
        combo.setUpdatedAt(Instant.now());

        Meal savedCombo = mealRepository.save(combo);

        return ResponseEntity.ok(safeGetMealResponse(savedCombo));
    }

    /**
     * Get all combo deals for a specific cook
     */
    @GetMapping("/cook/{cookId}")
    public ResponseEntity<List<MealResponse>> getCombosByCook(@PathVariable String cookId) {
        try {
            List<Meal> combos = mealRepository.findByCookId(cookId).stream()
                    .filter(m -> m != null && m.isCombo())
                    .collect(Collectors.toList());

            List<MealResponse> responses = combos.stream()
                    .map(this::safeGetMealResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("Error fetching combos for cook: " + e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * Delete / Deactivate a combo deal
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCombo(@PathVariable String id, Principal principal) {
        User cook = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Cook not found"));

        Meal combo = mealRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Combo not found"));

        if (!combo.getCookId().equals(cook.getId())) {
            throw new UnauthorizedException("You can only delete your own combo deals");
        }

        mealRepository.deleteById(id);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Combo deal removed successfully");
        return ResponseEntity.ok(response);
    }
}
