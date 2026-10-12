package com.neighborplates.repository;

import com.neighborplates.model.Vehicle;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends MongoRepository<Vehicle, String> {

    List<Vehicle> findByRiderIdAndActiveTrueOrderByCreatedAtDesc(String riderId);

    Optional<Vehicle> findByIdAndRiderId(String id, String riderId);

    Optional<Vehicle> findByRiderIdAndIsPrimaryTrueAndActiveTrue(String riderId);

    boolean existsByRiderIdAndPlateNumberIgnoreCaseAndActiveTrue(String riderId, String plateNumber);
}
