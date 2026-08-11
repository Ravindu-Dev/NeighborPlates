package com.neighborplates.dto.response;

import com.neighborplates.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminPayoutSummaryResponse {
    private double totalRevenue;
    private double totalCommission;
    private double totalPendingCookPayouts;
    private double totalSettledCookPayouts;
    private double totalPendingRiderPayouts;
    private double totalSettledRiderPayouts;
    private List<UserPayoutBalance> userBalances = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserPayoutBalance {
        private String userId;
        private String name;
        private String email;
        private String phone;
        private UserRole role;
        private double pendingBalance;
        private double totalLifetimeEarnings;
        private int pendingOrderCount;
    }
}
