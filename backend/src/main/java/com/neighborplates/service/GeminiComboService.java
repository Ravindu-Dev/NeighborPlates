package com.neighborplates.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GeminiComboService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    /**
     * Recommends active combo deals to a customer using Gemini AI,
     * analyzing customer's past orders, preferred cuisines, and spending habits.
     */
    public List<Map<String, Object>> recommendCombosForCustomer(
            User customer,
            List<Order> customerOrders,
            List<Meal> activeCombos,
            Map<String, Meal> allMealsById) {

        if (activeCombos == null || activeCombos.isEmpty()) {
            return Collections.emptyList();
        }

        if (allMealsById == null) {
            allMealsById = Collections.emptyMap();
        }

        // Build customer order history profile
        Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);
        StringBuilder orderHistoryText = new StringBuilder();
        Map<String, Integer> cuisineCount = new HashMap<>();
        double totalSpent = 0.0;
        int orderCount = 0;

        if (customerOrders != null) {
            for (Order order : customerOrders) {
                if (order != null && order.getCreatedAt() != null && order.getCreatedAt().isAfter(thirtyDaysAgo)) {
                    orderCount++;
                    totalSpent += order.getTotalAmount();

                    List<String> itemNames = new ArrayList<>();
                    if (order.getItems() != null) {
                        for (Order.OrderItem item : order.getItems()) {
                            if (item != null) {
                                Meal m = allMealsById.get(item.getMealId());
                                if (m != null && m.getCuisineType() != null) {
                                    cuisineCount.merge(m.getCuisineType(), Math.max(1, item.getQuantity()), Integer::sum);
                                }
                                String name = item.getName() != null ? item.getName() : "Dish";
                                itemNames.add(name + " (x" + item.getQuantity() + ")");
                            }
                        }
                    }

                    String dateStr = order.getCreatedAt().toString();
                    if (dateStr.length() > 10) {
                        dateStr = dateStr.substring(0, 10);
                    }

                    orderHistoryText.append(String.format(
                        "- Order on %s: %s | Total: LKR %.0f\n",
                        dateStr,
                        String.join(", ", itemNames),
                        order.getTotalAmount()
                    ));
                }
            }
        }

        // Build active combo deals available
        StringBuilder combosContext = new StringBuilder();
        for (Meal combo : activeCombos) {
            if (combo == null) continue;

            List<String> includedNames = new ArrayList<>();
            if (combo.getIncludedMealIds() != null) {
                for (String mid : combo.getIncludedMealIds()) {
                    Meal m = allMealsById.get(mid);
                    if (m != null) {
                        includedNames.add(m.getName() + " (LKR " + Math.round(m.getPrice()) + ")");
                    }
                }
            }

            combosContext.append(String.format(
                "- COMBO_ID: %s | Name: %s | Price: LKR %.0f (Original: LKR %.0f, Discount: %.0f%%) | Cuisine: %s | Portions Left: %d | Includes: [%s] | Description: %s\n",
                combo.getId() != null ? combo.getId() : "",
                combo.getName() != null ? combo.getName() : "Combo",
                combo.getPrice(),
                combo.getOriginalTotalPrice(),
                combo.getDiscountPercentage(),
                combo.getCuisineType() != null ? combo.getCuisineType() : "General",
                combo.getPortionsRemaining(),
                String.join(", ", includedNames),
                combo.getDescription() != null ? combo.getDescription() : "N/A"
            ));
        }

        String topCuisines = cuisineCount.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .collect(Collectors.joining(", "));

        String prompt = String.format("""
            You are the smart AI meal recommendation engine for NeighborPlates, a home-cooked food delivery app.
            
            ## Customer Profile:
            - Name: %s
            - Total Orders (Past 30 days): %d
            - Total Spent: LKR %.0f
            - Favorite/Most Ordered Cuisines: %s
            
            ## Customer Order History:
            %s
            
            ## Available Active Combo Deals:
            %s
            
            ## Your Task:
            Analyze this customer's food tastes, spending habits, and recent orders.
            Select the top matching combo deals (up to 4) from the Available Active Combo Deals above.
            For each recommended combo, provide a personalized, friendly pitch explaining WHY this combo fits them.
            
            For each recommendation provide:
            1. "comboId": exact COMBO_ID from the list above
            2. "matchScore": integer from 85 to 99 representing relevance
            3. "tag": a catchy 2-3 word badge (e.g. "🎯 Perfect Taste Match", "💰 Best Value Saver", "🔥 Chef You Love", "🌶️ Spicy Favorite", "🍱 Complete Feast")
            4. "reason": A personalized 1-2 sentence explanation speaking directly to the user (e.g., "Because you frequently enjoy Sri Lankan curries on weekends, Chef Sarah's bundle gives you a full feast at 20%% off!")
            
            IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no other text.
            Format:
            [
              {
                "comboId": "combo_id_here",
                "matchScore": 96,
                "tag": "🎯 Perfect Taste Match",
                "reason": "Personalized reason here"
              }
            ]
            """,
            customer != null && customer.getName() != null ? customer.getName() : "Valued Customer",
            orderCount,
            totalSpent,
            !topCuisines.isEmpty() ? topCuisines : "Sri Lankan, Asian, Home-style",
            orderHistoryText.length() > 0 ? orderHistoryText.toString() : "New customer (no previous orders yet). Recommend top value and popular combos.",
            combosContext.toString()
        );

        List<Map<String, Object>> aiResults = callGeminiApi(prompt);

        if (aiResults != null && !aiResults.isEmpty()) {
            return aiResults;
        }

        // Fallback recommendations if AI fails or returns empty
        return generateFallbackRecommendations(activeCombos);
    }

    private List<Map<String, Object>> generateFallbackRecommendations(List<Meal> activeCombos) {
        List<Map<String, Object>> fallback = new ArrayList<>();
        int count = 0;
        for (Meal combo : activeCombos) {
            if (combo == null || combo.getId() == null) continue;
            if (count >= 4) break;
            Map<String, Object> item = new HashMap<>();
            item.put("comboId", combo.getId());
            item.put("matchScore", 90 + (count == 0 ? 5 : count == 1 ? 3 : 0));
            item.put("tag", count == 0 ? "🔥 Top Combo Deal" : count == 1 ? "💰 Great Savings" : "⭐ Popular Bundle");
            item.put("reason", String.format("Save %.0f%% with %s — freshly prepared bundled meals from your local home chef!",
                    combo.getDiscountPercentage() > 0 ? combo.getDiscountPercentage() : 15.0,
                    combo.getName() != null ? combo.getName() : "this combo"));
            fallback.add(item);
            count++;
        }
        return fallback;
    }

    private List<Map<String, Object>> callGeminiApi(String prompt) {
        try {
            if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || geminiApiKey.contains("YOUR_GEMINI_API_KEY")) {
                return Collections.emptyList();
            }

            String url = GEMINI_API_URL + "?key=" + geminiApiKey;

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", prompt);

            Map<String, Object> content = new HashMap<>();
            content.put("parts", Collections.singletonList(textPart));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", Collections.singletonList(content));

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", 0.6);
            generationConfig.put("maxOutputTokens", 2048);
            requestBody.put("generationConfig", generationConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return parseGeminiResponse(response.getBody());
            }

            return Collections.emptyList();
        } catch (Exception e) {
            System.err.println("Gemini API call notice: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");

            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode content = firstCandidate.path("content");
                JsonNode parts = content.path("parts");

                if (parts.isArray() && parts.size() > 0) {
                    String text = parts.get(0).path("text").asText();

                    text = text.trim();
                    if (text.startsWith("```json")) {
                        text = text.substring(7);
                    } else if (text.startsWith("```")) {
                        text = text.substring(3);
                    }
                    if (text.endsWith("```")) {
                        text = text.substring(0, text.length() - 3);
                    }
                    text = text.trim();

                    List<Map<String, Object>> recommendations = objectMapper.readValue(text,
                            objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
                    return recommendations;
                }
            }

            return Collections.emptyList();
        } catch (Exception e) {
            System.err.println("Failed to parse Gemini response: " + e.getMessage());
            return Collections.emptyList();
        }
    }
}
