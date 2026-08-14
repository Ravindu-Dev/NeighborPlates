package com.neighborplates.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "reviews")
public class Review {

    @Id
    private String id;

    private String orderId;

    private String mealId;

    private String cookId;

    private String customerId;

    private String customerName;

    private int rating; // 1 to 5 stars

    private String comment;

    private String photoUrl;

    private boolean flagged = false;

    private String flaggedReason;

    private Instant createdAt = Instant.now();
}
