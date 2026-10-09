package com.neighborplates.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiderSummaryResponse {
    private int totalDeliveries;
    private int activeDeliveries;
    private double totalEarnings;
    
    // Period metrics
    private PeriodStats today;
    private PeriodStats thisWeek;
    private PeriodStats thisMonth;

    // Daily breakdown for the past 7 days (for chart)
    private List<DailyMetric> last7Days;

    // Performance rates (null if insufficient data)
    private Double onTimeRate;
    private Double completionRate;

    // Active order currently in progress (if any)
    private OrderResponse activeOrder;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PeriodStats {
        private int deliveryCount;
        private double earnings;
        private double baseEarnings;
        private double tips;
        private double surge;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyMetric {
        private String dayLabel; // "M", "T", "W", "T", "F", "S", "S"
        private String date; // "yyyy-MM-dd"
        private int count;
        private double earnings;
        private boolean isToday;
    }
}
