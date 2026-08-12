package com.neighborplates.repository;

import com.neighborplates.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {
    List<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<Order> findByCookIdOrderByCreatedAtDesc(String cookId);
    List<Order> findByRiderIdOrderByCreatedAtDesc(String riderId);
    List<Order> findByStatusAndRiderIdIsNull(com.neighborplates.model.enums.OrderStatus status);
    List<Order> findByDisputedTrueOrderByDisputeReportedAtDesc();
    List<Order> findByStatusInOrderByCreatedAtDesc(List<com.neighborplates.model.enums.OrderStatus> statuses);
}
