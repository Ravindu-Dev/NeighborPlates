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
    private long totalRiders;
    private long totalOrders;
    private long activeOrdersCount;
    private long pendingCookVerifications;
    private long pendingRiderVerifications;
    private double totalRevenue;
    private double totalCommission;
    private double totalPendingCookPayouts;
    private double totalPendingRiderPayouts;
}

