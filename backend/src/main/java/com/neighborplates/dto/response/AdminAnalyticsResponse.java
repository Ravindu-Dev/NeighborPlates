package com.neighborplates.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsResponse {
    private long totalUsers;
    private long totalCustomers;
    private long totalCooks;
    private long totalOrders;
    private double totalRevenue;
    private double totalCommission;
}
