package com.neighborplates.repository;

import com.neighborplates.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByMealIdOrderByCreatedAtDesc(String mealId);
    List<Review> findByCookIdOrderByCreatedAtDesc(String cookId);
    List<Review> findByFlaggedTrueOrderByCreatedAtDesc();
    List<Review> findAllByOrderByCreatedAtDesc();
}
