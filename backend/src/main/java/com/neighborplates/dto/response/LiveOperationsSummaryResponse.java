package com.neighborplates.dto.response;

import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LiveOperationsSummaryResponse {

    private long activeOrdersCount;
    private long delayedOrdersCount;
    private long openDisputesCount;
    private List<OrderOperationalDetail> liveOrders;
    private List<User> availableRiders;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderOperationalDetail {
        private Order order;
        private String customerName;
        private String customerPhone;
        private String cookName;
        private String cookPhone;
        private String riderName;
        private String riderPhone;
        private boolean delayed;
        private String delayReason; // e.g. "Preparation delayed (>15 mins)", "Rider assignment delayed"
        private List<Double> cookLocation; // [lng, lat]
        private String cookDistrict;
        private String cookTown;
        private List<Double> customerLocation; // [lng, lat]
        private List<Double> riderLocation; // [lng, lat]

        public OrderOperationalDetail(Order order, String customerName, String customerPhone,
                                      String cookName, String cookPhone, String riderName,
                                      String riderPhone, boolean delayed, String delayReason) {
            this.order = order;
            this.customerName = customerName;
            this.customerPhone = customerPhone;
            this.cookName = cookName;
            this.cookPhone = cookPhone;
            this.riderName = riderName;
            this.riderPhone = riderPhone;
            this.delayed = delayed;
            this.delayReason = delayReason;
        }
    }
}
