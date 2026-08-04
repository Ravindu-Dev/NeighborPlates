package com.neighborplates.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {

    @Min(value = 1, message = "Amount must be greater than zero")
    private double amount;

    @NotBlank(message = "Card number is required")
    private String cardNumber;

    @NotBlank(message = "Expiration date is required")
    private String expiry;

    @NotBlank(message = "CVV is required")
    private String cvv;

    @NotBlank(message = "Cardholder name is required")
    private String cardholderName;
}
