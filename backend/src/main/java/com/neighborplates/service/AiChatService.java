package com.neighborplates.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.neighborplates.dto.ai.AiChatRequest;
import com.neighborplates.dto.ai.AiChatResponse;
import com.neighborplates.dto.ai.RichCard;
import com.neighborplates.model.Meal;
import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.MealRepository;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final MealRepository mealRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${cometapi.api-key:sk-q2JEkSNchZRaPQ7WkzdMApbOZZJ8U6iGgRgHQA7gvBRzDHSv}")
    private String apiKey;

    @Value("${cometapi.base-url:https://api.cometapi.com/v1}")
    private String baseUrl;

    @Value("${cometapi.model:gpt-4o-mini}")
    private String modelName;

    public AiChatResponse processUserQuery(AiChatRequest request, String userId) {
        List<RichCard> generatedCards = new ArrayList<>();
        String userQuery = request.getMessage() != null ? request.getMessage().trim() : "";
        String lowerQuery = userQuery.toLowerCase();

        // 1. Database Tool Executions

        // Search Cooks/Chefs in Database (e.g. "chief names", "chef names", "cooks", "kitchens", "sellers")
        if (lowerQuery.contains("chief") || lowerQuery.contains("chef") || lowerQuery.contains("cook") || lowerQuery.contains("kitchen") || lowerQuery.contains("seller") || lowerQuery.contains("who makes")) {
            executeCookListSearch(generatedCards);
        }

        // Search Meals & Dishes (e.g. "rice", "curry", "kottu", "food", "shops")
        if (lowerQuery.contains("rice") || lowerQuery.contains("shop") || lowerQuery.contains("sell") || lowerQuery.contains("food") || lowerQuery.contains("meal") || lowerQuery.contains("dish")) {
            executeMealAndCookSearch(userQuery, generatedCards);
        }

        // Order Status & History Search
        if (lowerQuery.contains("order") || lowerQuery.contains("track") || lowerQuery.contains("where is") || lowerQuery.contains("status") || lowerQuery.contains("history")) {
            executeOrderSearch(userId, generatedCards);
        }

        // Recommendations Search
        if (lowerQuery.contains("recommend") || lowerQuery.contains("cheap") || lowerQuery.contains("budget") || lowerQuery.contains("top") || lowerQuery.contains("best")) {
            executeRecommendations(generatedCards);
        }

        // 2. System App Feature Help Knowledge Base Lookup
        String systemHelpContext = resolveAppHelpGuide(lowerQuery);

        // 3. CometAPI LLM Synthesis with Domain Guardrails
        String replyText = callCometApi(request, userQuery, generatedCards, systemHelpContext);

        // Deduplicate cards by unique card keys
        List<RichCard> uniqueCards = deduplicateCards(generatedCards);

        // 4. Suggested Prompts formatted in LKR
        List<String> suggestedPrompts = Arrays.asList(
                "👨‍🍳 List home cooks & chefs",
                "🌾 Which shops sell rice?",
                "📦 How to place an order?",
                "🔥 Top meals under Rs. 1,500"
        );

        return AiChatResponse.builder()
                .replyText(replyText)
                .sessionId(request.getSessionId() != null ? request.getSessionId() : UUID.randomUUID().toString())
                .cards(uniqueCards)
                .suggestedPrompts(suggestedPrompts)
                .build();
    }

    private List<RichCard> deduplicateCards(List<RichCard> cards) {
        List<RichCard> result = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();
        for (RichCard card : cards) {
            String key = card.getCardType() + "_" +
                    (card.getMealId() != null ? card.getMealId() : "") + "_" +
                    (card.getCookId() != null ? card.getCookId() : "") + "_" +
                    (card.getOrderId() != null ? card.getOrderId() : "");
            if (!seenKeys.contains(key)) {
                seenKeys.add(key);
                result.add(card);
            }
        }
        return result;
    }


    private void executeCookListSearch(List<RichCard> cards) {
        try {
            List<User> cooks = userRepository.findByRole(UserRole.COOK);
            for (User cook : cooks) {
                if (!cook.isActive()) continue;
                String cookName = cook.getProfile() != null && cook.getProfile().getName() != null
                        ? cook.getProfile().getName()
                        : "Home Cook";
                String kitchenName = cookName + "'s Kitchen";
                double rating = cook.getStats() != null && cook.getStats().getAvgRating() > 0
                        ? cook.getStats().getAvgRating()
                        : 4.8;
                int mealCount = mealRepository.findByCookId(cook.getId()).size();

                cards.add(RichCard.builder()
                        .cardType("COOK_CARD")
                        .cookId(cook.getId())
                        .cookName(cookName)
                        .kitchenName(kitchenName)
                        .address("Colombo, Sri Lanka")
                        .rating(rating)
                        .cuisineType("Sri Lankan Home Dishes")
                        .totalMealsCount(mealCount)
                        .build());
            }
        } catch (Exception e) {
            log.error("Error searching cooks from database", e);
        }
    }

    private void executeMealAndCookSearch(String query, List<RichCard> cards) {
        try {
            List<Meal> allActive = mealRepository.findByActiveTrue();
            List<Meal> matchedMeals = new ArrayList<>();

            String searchTerm = query.toLowerCase().replaceAll("[^a-zA-Z0-9 ]", "");
            for (Meal m : allActive) {
                String name = m.getName() != null ? m.getName().toLowerCase() : "";
                String desc = m.getDescription() != null ? m.getDescription().toLowerCase() : "";
                String cuisine = m.getCuisineType() != null ? m.getCuisineType().toLowerCase() : "";

                if (searchTerm.isEmpty() || name.contains(searchTerm) || desc.contains(searchTerm) || cuisine.contains(searchTerm) || (searchTerm.contains("rice") && (name.contains("rice") || desc.contains("biryani") || desc.contains("fried rice")))) {
                    matchedMeals.add(m);
                }
            }

            if (matchedMeals.isEmpty()) {
                matchedMeals = allActive.stream().limit(6).collect(Collectors.toList());
            }

            Set<String> processedCookIds = new HashSet<>();
            int count = 0;

            for (Meal meal : matchedMeals) {
                if (count >= 5) break;

                String cookName = "Home Kitchen";
                String kitchenName = "NeighborPlates Home Kitchen";
                double cookRating = 4.8;

                if (meal.getCookId() != null) {
                    Optional<User> cookOpt = userRepository.findById(meal.getCookId());
                    if (cookOpt.isPresent()) {
                        User cook = cookOpt.get();
                        if (cook.getProfile() != null && cook.getProfile().getName() != null) {
                            cookName = cook.getProfile().getName();
                        }
                        kitchenName = cookName + "'s Kitchen";
                        if (cook.getStats() != null && cook.getStats().getAvgRating() > 0) {
                            cookRating = cook.getStats().getAvgRating();
                        }

                        if (!processedCookIds.contains(cook.getId())) {
                            processedCookIds.add(cook.getId());
                            cards.add(RichCard.builder()
                                    .cardType("COOK_CARD")
                                    .cookId(cook.getId())
                                    .cookName(cookName)
                                    .kitchenName(kitchenName)
                                    .address("Colombo, Sri Lanka")
                                    .rating(cookRating)
                                    .cuisineType(meal.getCuisineType() != null ? meal.getCuisineType() : "Sri Lankan")
                                    .totalMealsCount(mealRepository.findByCookId(cook.getId()).size())
                                    .build());
                        }
                    }
                }

                String photo = (meal.getPhotos() != null && !meal.getPhotos().isEmpty())
                        ? meal.getPhotos().get(0)
                        : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";

                cards.add(RichCard.builder()
                        .cardType("MEAL_CARD")
                        .mealId(meal.getId())
                        .mealName(meal.getName())
                        .cookId(meal.getCookId())
                        .cookName(kitchenName)
                        .photoUrl(photo)
                        .price(meal.getPrice())
                        .currency("Rs.")
                        .rating(meal.getAvgRating() > 0 ? meal.getAvgRating() : 4.7)
                        .category(meal.getCategory() != null ? meal.getCategory().name() : "MAIN")
                        .portionsRemaining(meal.getPortionsRemaining())
                        .build());

                count++;
            }
        } catch (Exception e) {
            log.error("Error executing meal/cook search", e);
        }
    }

    private void executeOrderSearch(String userId, List<RichCard> cards) {
        try {
            if (userId == null || userId.isEmpty()) return;
            List<Order> orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(userId);
            if (!orders.isEmpty()) {
                Order latest = orders.get(0);
                List<String> itemsSummary = latest.getItems().stream()
                        .map(i -> i.getQuantity() + "x " + i.getName())
                        .collect(Collectors.toList());

                cards.add(RichCard.builder()
                        .cardType("ORDER_CARD")
                        .orderId(latest.getOrderNumber() != null ? latest.getOrderNumber() : latest.getId())
                        .orderStatus(latest.getStatus() != null ? latest.getStatus().name() : "PLACED")
                        .totalAmount(latest.getTotalAmount())
                        .currency("Rs.")
                        .estimatedDelivery("25 - 35 mins")
                        .itemSummary(itemsSummary)
                        .build());
            }
        } catch (Exception e) {
            log.error("Error fetching order status", e);
        }
    }

    private void executeRecommendations(List<RichCard> cards) {
        try {
            List<Meal> topMeals = mealRepository.findByActiveTrue().stream()
                    .sorted((m1, m2) -> Double.compare(m2.getAvgRating(), m1.getAvgRating()))
                    .limit(4)
                    .collect(Collectors.toList());

            for (Meal meal : topMeals) {
                String photo = (meal.getPhotos() != null && !meal.getPhotos().isEmpty())
                        ? meal.getPhotos().get(0)
                        : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";

                cards.add(RichCard.builder()
                        .cardType("MEAL_CARD")
                        .mealId(meal.getId())
                        .mealName(meal.getName())
                        .cookId(meal.getCookId())
                        .cookName("Featured Home Kitchen")
                        .photoUrl(photo)
                        .price(meal.getPrice())
                        .currency("Rs.")
                        .rating(meal.getAvgRating() > 0 ? meal.getAvgRating() : 4.9)
                        .category(meal.getCategory() != null ? meal.getCategory().name() : "SPECIAL")
                        .portionsRemaining(meal.getPortionsRemaining())
                        .build());
            }
        } catch (Exception e) {
            log.error("Error fetching recommendations", e);
        }
    }

    private String resolveAppHelpGuide(String query) {
        if (query.contains("how to order") || query.contains("place an order") || query.contains("how do i order") || query.contains("buy food")) {
            return "NeighborPlates App Guide - Placing an Order:\n" +
                    "1. Browse available meals on the Home or Search screen.\n" +
                    "2. Tap any dish card to view ingredients, price in LKR, and portion details.\n" +
                    "3. Tap 'Add to Cart'.\n" +
                    "4. Go to your Cart, tap 'Checkout', enter your delivery address and payment method, then confirm!";
        }

        if (query.contains("how to track") || query.contains("view history") || query.contains("my orders")) {
            return "NeighborPlates App Guide - Tracking & Order History:\n" +
                    "1. Open the 'My Orders' tab from the bottom navigation bar.\n" +
                    "2. View active orders with live progress status (Placed, Preparing, Delivered).\n" +
                    "3. Tap any active order to open the real-time tracking screen!";
        }

        if (query.contains("payment") || query.contains("pay") || query.contains("stripe")) {
            return "NeighborPlates App Guide - Payments & Currency:\n" +
                    "All transactions on NeighborPlates are processed in Sri Lankan Rupees (LKR / Rs.). We support secure online card payments via Stripe and scheduled pre-orders.";
        }

        return "";
    }

    private String callCometApi(AiChatRequest request, String userQuery, List<RichCard> cards, String appHelpContext) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey.trim());

            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", modelName);
            body.put("temperature", 0.3); // Lower temperature for strict domain adherence

            ArrayNode messages = objectMapper.createArrayNode();

            ObjectNode sysMsg = objectMapper.createObjectNode();
            sysMsg.put("role", "system");
            sysMsg.put("content", "You are Platie, the official AI Customer Assistant for the NeighborPlates platform in Sri Lanka.\n" +
                    "STRICT DOMAIN BOUNDARY RULES:\n" +
                    "1. You MUST ONLY answer questions directly related to NeighborPlates, home cooks/chefs, meals, food ordering, order status, prices in Sri Lankan Rupees (LKR / Rs.), and how to use NeighborPlates app features.\n" +
                    "2. IF the user asks ANY off-topic or general knowledge question UNRELATED to NeighborPlates (e.g., world history, famous historical people/chefs, coding, math, general world trivia, politics, sports), YOU MUST DECLINE politely by saying:\n" +
                    "\"I am Platie, your NeighborPlates Assistant! I can only assist with NeighborPlates app features, home-cooked meals, local home kitchens, and order tracking in Sri Lanka. Please ask me about our meals, home cooks, or app features!\"\n" +
                    "3. When asked about cooks, chefs, or kitchen names (e.g. 'chief names', 'cook names', 'chefs'), refer ONLY to the registered home cooks from the NeighborPlates database provided in the context.\n" +
                    "4. Always present currency in LKR / Rs. Keep text responses polite, clear, and helpful.");
            messages.add(sysMsg);

            if (request.getHistory() != null) {
                for (AiChatRequest.ChatMessageHistory h : request.getHistory()) {
                    ObjectNode msg = objectMapper.createObjectNode();
                    msg.put("role", h.getRole());
                    msg.put("content", h.getContent());
                    messages.add(msg);
                }
            }

            ObjectNode userMsg = objectMapper.createObjectNode();
            userMsg.put("role", "user");

            StringBuilder fullPrompt = new StringBuilder(userQuery);
            if (!appHelpContext.isEmpty()) {
                fullPrompt.append("\n\n[NeighborPlates App Guide Context:\n").append(appHelpContext).append("]");
            }
            if (!cards.isEmpty()) {
                fullPrompt.append("\n\n[NeighborPlates Database Results: Found ").append(cards.size()).append(" live cooks/items in Sri Lanka database. Reference these exact cooks/meals in your answer]");
            }

            userMsg.put("content", fullPrompt.toString());
            messages.add(userMsg);

            body.set("messages", messages);

            HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);
            String url = baseUrl + "/chat/completions";

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    return choices.get(0).path("message").path("content").asText();
                }
            }
        } catch (Exception e) {
            log.warn("CometAPI call exception handled: {}", e.getMessage());
        }

        if (!cards.isEmpty()) {
            return "Here are the home cooks and fresh dishes available on NeighborPlates in Sri Lanka from our system database (prices in LKR / Rs.).";
        }
        if (!appHelpContext.isEmpty()) {
            return appHelpContext;
        }

        return "I am Platie, your NeighborPlates Assistant! I can only assist with NeighborPlates app features, home-cooked meals, local home kitchens, and order tracking in Sri Lanka. Please ask me about our meals, home cooks, or app features!";
    }
}
