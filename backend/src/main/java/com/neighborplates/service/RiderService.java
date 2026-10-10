package com.neighborplates.service;

import com.neighborplates.dto.response.OrderResponse;
import com.neighborplates.dto.response.RiderSummaryResponse;
import com.neighborplates.exception.ResourceNotFoundException;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.Order;
import com.neighborplates.model.User;
import com.neighborplates.model.enums.OrderStatus;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RiderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;

    public RiderService(OrderRepository orderRepository,
                        UserRepository userRepository,
                        OrderService orderService) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.orderService = orderService;
    }

    public RiderSummaryResponse getRiderSummary(String riderEmail) {
        User rider = userRepository.findByEmail(riderEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Rider not found"));

        if (rider.getRole() != UserRole.RIDER) {
            throw new UnauthorizedException("Only riders can access rider statistics");
        }

        List<Order> orders = orderRepository.findByRiderIdOrderByCreatedAtDesc(rider.getId());

        List<Order> completedOrders = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                .collect(Collectors.toList());

        List<Order> activeOrders = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.READY || o.getStatus() == OrderStatus.DELIVERING)
                .collect(Collectors.toList());

        int totalDeliveries = completedOrders.size();
        double totalEarnings = completedOrders.stream()
                .mapToDouble(o -> o.getRiderEarnings() != null ? o.getRiderEarnings() : 0.0)
                .sum();
        totalEarnings = Math.round(totalEarnings * 100.0) / 100.0;

        // Current time zone calculations (Asia/Colombo UTC+5:30)
        ZoneId zoneId = ZoneId.of("Asia/Colombo");
        ZonedDateTime nowZoned = ZonedDateTime.now(zoneId);
        LocalDate today = nowZoned.toLocalDate();

        // Period definitions
        Instant startOfToday = today.atStartOfDay(zoneId).toInstant();
        Instant startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1).atStartOfDay(zoneId).toInstant();
        Instant startOfMonth = today.withDayOfMonth(1).atStartOfDay(zoneId).toInstant();

        RiderSummaryResponse.PeriodStats todayStats = calculatePeriodStats(completedOrders, startOfToday, nowZoned.toInstant());
        RiderSummaryResponse.PeriodStats weekStats = calculatePeriodStats(completedOrders, startOfWeek, nowZoned.toInstant());
        RiderSummaryResponse.PeriodStats monthStats = calculatePeriodStats(completedOrders, startOfMonth, nowZoned.toInstant());

        // Last 7 days breakdown for weekly chart
        List<RiderSummaryResponse.DailyMetric> last7Days = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Instant dayStart = day.atStartOfDay(zoneId).toInstant();
            Instant dayEnd = day.plusDays(1).atStartOfDay(zoneId).toInstant();

            List<Order> dayOrders = completedOrders.stream()
                    .filter(o -> {
                        Instant ref = o.getDeliveredAt() != null ? o.getDeliveredAt() : o.getCreatedAt();
                        return ref != null && !ref.isBefore(dayStart) && ref.isBefore(dayEnd);
                    })
                    .collect(Collectors.toList());

            double dayEarnings = dayOrders.stream()
                    .mapToDouble(o -> o.getRiderEarnings() != null ? o.getRiderEarnings() : 0.0)
                    .sum();
            dayEarnings = Math.round(dayEarnings * 100.0) / 100.0;

            String dayLetter = day.getDayOfWeek().getDisplayName(TextStyle.NARROW, Locale.ENGLISH);

            last7Days.add(RiderSummaryResponse.DailyMetric.builder()
                    .dayLabel(dayLetter)
                    .date(day.format(DateTimeFormatter.ISO_LOCAL_DATE))
                    .count(dayOrders.size())
                    .earnings(dayEarnings)
                    .isToday(i == 0)
                    .build());
        }

        // On-time rate calculation
        long ordersWithSchedule = completedOrders.stream()
                .filter(o -> o.getScheduledFor() != null && o.getDeliveredAt() != null)
                .count();

        Double onTimeRate = null;
        if (ordersWithSchedule > 0) {
            long onTimeOrders = completedOrders.stream()
                    .filter(o -> o.getScheduledFor() != null && o.getDeliveredAt() != null)
                    .filter(o -> !o.getDeliveredAt().isAfter(o.getScheduledFor().plusSeconds(300)))
                    .count();
            onTimeRate = Math.round((onTimeOrders * 100.0 / ordersWithSchedule) * 10.0) / 10.0;
        }

        Double completionRate = null;
        if (!orders.isEmpty()) {
            completionRate = Math.round((completedOrders.size() * 100.0 / orders.size()) * 10.0) / 10.0;
        }

        // Active order in progress
        OrderResponse activeOrderResponse = null;
        if (!activeOrders.isEmpty()) {
            Order active = activeOrders.get(0);
            User customer = userRepository.findById(active.getCustomerId()).orElse(null);
            User cook = userRepository.findById(active.getCookId()).orElse(null);
            activeOrderResponse = orderService.mapToOrderResponse(active, customer, cook, rider);
        }

        return RiderSummaryResponse.builder()
                .totalDeliveries(totalDeliveries)
                .activeDeliveries(activeOrders.size())
                .totalEarnings(totalEarnings)
                .today(todayStats)
                .thisWeek(weekStats)
                .thisMonth(monthStats)
                .last7Days(last7Days)
                .onTimeRate(onTimeRate)
                .completionRate(completionRate)
                .activeOrder(activeOrderResponse)
                .build();
    }

    private RiderSummaryResponse.PeriodStats calculatePeriodStats(List<Order> orders, Instant start, Instant end) {
        List<Order> filtered = orders.stream()
                .filter(o -> {
                    Instant ref = o.getDeliveredAt() != null ? o.getDeliveredAt() : o.getCreatedAt();
                    return ref != null && !ref.isBefore(start) && !ref.isAfter(end);
                })
                .collect(Collectors.toList());

        double totalEarn = filtered.stream()
                .mapToDouble(o -> o.getRiderEarnings() != null ? o.getRiderEarnings() : 0.0)
                .sum();
        totalEarn = Math.round(totalEarn * 100.0) / 100.0;

        return RiderSummaryResponse.PeriodStats.builder()
                .deliveryCount(filtered.size())
                .earnings(totalEarn)
                .baseEarnings(totalEarn)
                .tips(0.0)
                .surge(0.0)
                .build();
    }
}
