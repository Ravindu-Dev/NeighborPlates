package com.neighborplates.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RichCard {

    private String cardType; // "MEAL_CARD", "COOK_CARD", "ORDER_CARD"

    // Meal Card Properties
    private String mealId;
    private String mealName;
    private String cookId;
    private String cookName;
    private String photoUrl;
    private double price;
    private String currency; // "LKR" or "Rs."
    private double rating;
    private String category;
    private int portionsRemaining;

    // Cook/Shop Card Properties
    private String kitchenName;
    private String cuisineType;
    private String address;
    private int totalMealsCount;

    // Order Card Properties
    private String orderId;
    private String orderStatus;
    private double totalAmount;
    private String estimatedDelivery;
    private List<String> itemSummary;
}
