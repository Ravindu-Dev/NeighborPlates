package com.neighborplates.controller;

import com.neighborplates.dto.request.PaymentRequest;
import com.neighborplates.dto.response.PaymentResponse;
import com.stripe.Stripe;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import com.stripe.model.Token;
import com.stripe.model.Charge;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Value("${stripe.api.key:}")
    private String stripeApiKey;

    @PostMapping("/charge")
    public ResponseEntity<PaymentResponse> chargeCard(@Valid @RequestBody PaymentRequest request) {
        // Clean up card numbers for checking
        String cleanCard = request.getCardNumber().replaceAll("\\s+", "");

        // Basic card validation
        if (cleanCard.length() < 13 || cleanCard.length() > 19) {
            return ResponseEntity.badRequest().body(new PaymentResponse(false, null, "Invalid card number length."));
        }
        if (request.getCvv().length() < 3 || request.getCvv().length() > 4) {
            return ResponseEntity.badRequest().body(new PaymentResponse(false, null, "Invalid CVV."));
        }

        // Expiry parsing validation (MM/YY)
        if (!request.getExpiry().matches("(0[1-9]|1[0-2])/\\d{2}")) {
            return ResponseEntity.badRequest().body(new PaymentResponse(false, null, "Invalid expiration date format. Use MM/YY."));
        }

        // Validate expiration date is in the future
        String[] expiryParts = request.getExpiry().split("/");
        int expiryMonth = Integer.parseInt(expiryParts[0]);
        int expiryYear = 2000 + Integer.parseInt(expiryParts[1]);

        java.time.LocalDate now = java.time.LocalDate.now();
        int curYear = now.getYear();
        int curMonth = now.getMonthValue();

        if (expiryYear < curYear || (expiryYear == curYear && expiryMonth < curMonth)) {
            return ResponseEntity.ok(new PaymentResponse(false, null, "The credit card has expired. Please enter a valid expiration date."));
        }

        // Simulate Stripe processing network delay
        try {
            Thread.sleep(1200);
        } catch (InterruptedException ignored) {}

        // Check if Stripe API Key is configured. If so, execute Stripe API calls
        if (stripeApiKey != null && !stripeApiKey.trim().isEmpty()) {
            try {
                Stripe.apiKey = stripeApiKey;
                System.out.println("Processing payment via Stripe Java SDK using key: " + stripeApiKey.substring(0, Math.min(8, stripeApiKey.length())) + "...");

                // Map card number to a standard Stripe test token to avoid PCI-DSS raw card data restrictions
                String stripeToken;
                if (cleanCard.equals("4242424242424242") || cleanCard.startsWith("4242")) {
                    stripeToken = "tok_visa";
                } else if (cleanCard.equals("4000000000000002")) {
                    stripeToken = "tok_chargeDeclined";
                } else if (cleanCard.equals("4000000000000069")) {
                    stripeToken = "tok_chargeDeclinedIncorrectCvc";
                } else if (cleanCard.equals("4000000000000070")) {
                    stripeToken = "tok_chargeDeclinedExpiredCard";
                } else if (cleanCard.startsWith("5555")) {
                    stripeToken = "tok_mastercard";
                } else if (cleanCard.startsWith("37") || cleanCard.startsWith("34")) {
                    stripeToken = "tok_amex";
                } else {
                    // Reject any other non-test cards
                    return ResponseEntity.ok(new PaymentResponse(false, null, "Your card was declined. Please use a valid Stripe test card (e.g., 4242 4242 4242 4242)."));
                }

                Map<String, Object> chargeParams = new HashMap<>();
                chargeParams.put("amount", (int) (request.getAmount() * 100)); // amount in cents
                chargeParams.put("currency", "lkr");
                chargeParams.put("source", stripeToken);
                chargeParams.put("description", "NeighborPlates Food Order - " + request.getCardholderName());

                Charge charge = Charge.create(chargeParams);
                return ResponseEntity.ok(new PaymentResponse(true, charge.getId(), "Stripe payment succeeded."));
            } catch (Exception e) {
                System.err.println("Stripe Error: " + e.getMessage());
                return ResponseEntity.ok(new PaymentResponse(false, null, "Stripe payment error: " + e.getMessage()));
            }
        }

        // Stripe Simulator fallback:
        // We accept card numbers that represent test cards.
        // Stripe's standard test card is 4242 4242 4242 4242.
        if (cleanCard.startsWith("4242") || cleanCard.startsWith("4000") || cleanCard.startsWith("5555")) {
            String transactionId = "ch_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
            return ResponseEntity.ok(new PaymentResponse(true, transactionId, "Stripe test payment succeeded (Simulated)."));
        } else {
            // For other card numbers, fail to show error handling capability in UI!
            return ResponseEntity.ok(new PaymentResponse(false, null, "Your card was declined. Please use a Stripe test card (e.g. 4242 4242 4242 4242)."));
        }
    }
}
