package com.neighborplates.repository;

import com.neighborplates.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    java.util.List<User> findByRole(com.neighborplates.model.enums.UserRole role);
}
