package com.neighborplates.repository;

import com.neighborplates.model.Meal;
import com.neighborplates.model.enums.MealCategory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealRepository extends MongoRepository<Meal, String> {
    List<Meal> findByCookId(String cookId);
    List<Meal> findByActiveTrue();
    List<Meal> findByActiveTrueAndCategory(MealCategory category);
}
