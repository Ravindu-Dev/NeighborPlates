package com.neighborplates.config;

import com.neighborplates.model.User;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.model.Order;
import com.neighborplates.model.enums.OrderStatus;
import com.neighborplates.repository.OrderRepository;
import com.neighborplates.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSeeder.class);

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, OrderRepository orderRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        seedAdminUser();
        seedRiderUser();
        seedSampleAvailableOrders();
    }

    private void seedAdminUser() {
        String adminEmail = "admin@neighborplates.com";
        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            logger.info("No admin user found. Seeding default system administrator...");

            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode("admin123")); // Default password
            admin.setRole(UserRole.ADMIN);
            
            User.UserProfile profile = new User.UserProfile();
            profile.setName("Platform Administrator");
            profile.setPhone("0000000000");
            profile.setAvatarUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde");
            
            // Set coordinates
            User.GeoJsonPoint point = new User.GeoJsonPoint();
            point.setType("Point");
            ArrayList<Double> coords = new ArrayList<>();
            coords.add(79.8612); // Colombo default longitude
            coords.add(6.9271);  // Colombo default latitude
            point.setCoordinates(coords);
            profile.setLocation(point);
            
            admin.setProfile(profile);
            admin.setCreatedAt(Instant.now());
            admin.setUpdatedAt(Instant.now());

            userRepository.save(admin);
            logger.info("Default system administrator seeded successfully with Email: '{}' and Password: 'admin123'", adminEmail);
        } else {
            logger.info("Admin user check: Present.");
        }
    }

    private void seedRiderUser() {
        String riderEmail = "rider@neighborplates.com";
        if (userRepository.findByEmail(riderEmail).isEmpty()) {
            logger.info("No default rider user found. Seeding default courier account...");

            User rider = new User();
            rider.setEmail(riderEmail);
            rider.setPasswordHash(passwordEncoder.encode("rider123")); // Default rider password
            rider.setRole(UserRole.RIDER);

            User.UserProfile profile = new User.UserProfile();
            profile.setName("Farhan Malik");
            profile.setPhone("+94 77 123 4567");
            profile.setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80");
            profile.setRiderVerified(true);
            profile.setIsAvailable(true);
            profile.setVehicleType("E-Bike");
            profile.setVehicleModel("Rad Power E-Bike Pro");
            profile.setVehiclePlate("#EB-4092");
            profile.setDeliveryRadius(5.0);
            profile.setHaccpCertified(true);
            profile.setThermalBackpack(true);
            profile.setSpillProofRack(true);
            profile.setHeatedWarmerPod(true);
            profile.setHotFoodPriority(true);
            profile.setAutoAcceptRush(true);
            profile.setNavigationApp("Google");

            User.GeoJsonPoint point = new User.GeoJsonPoint();
            point.setType("Point");
            ArrayList<Double> coords = new ArrayList<>();
            coords.add(79.8612);
            coords.add(6.9271);
            point.setCoordinates(coords);
            profile.setLocation(point);

            User.UserStats stats = new User.UserStats();
            stats.setTotalOrders(0);
            stats.setAvgRating(0.0);
            stats.setTotalEarnings(0.0);

            rider.setProfile(profile);
            rider.setStats(stats);
            rider.setCreatedAt(Instant.parse("2023-03-15T10:00:00Z"));
            rider.setUpdatedAt(Instant.now());

            userRepository.save(rider);
            logger.info("Default rider seeded successfully with Email: '{}' and Password: 'rider123'", riderEmail);
        } else {
            logger.info("Rider user check: Present.");
        }
    }

    private void seedSampleAvailableOrders() {
        List<Order> existing = orderRepository.findByStatusInAndRiderIdIsNull(
                List.of(OrderStatus.READY, OrderStatus.PREPARING, OrderStatus.ACCEPTED, OrderStatus.PLACED)
        );

        if (existing.size() >= 3) {
            logger.info("Sufficient live delivery orders present ({} orders found).", existing.size());
            return;
        }

        logger.info("Live rider order count is {}. Seeding realistic dispatch jobs...", existing.size());

        // Find or create default Cook
        User cook = userRepository.findByEmail("malinda@gmail.com")
                .or(() -> userRepository.findAll().stream().filter(u -> u.getRole() == UserRole.COOK).findFirst())
                .orElseGet(() -> {
                    User newCook = new User();
                    newCook.setEmail("nimali.cook@neighborplates.com");
                    newCook.setPasswordHash(passwordEncoder.encode("cook123"));
                    newCook.setRole(UserRole.COOK);
                    User.UserProfile p = new User.UserProfile();
                    p.setName("Nimali's Home Kitchen");
                    p.setPhone("+94 77 987 6543");
                    User.GeoJsonPoint pt = new User.GeoJsonPoint();
                    pt.setType("Point");
                    pt.setCoordinates(List.of(79.9268, 6.8480)); // Maharagama
                    p.setLocation(pt);
                    newCook.setProfile(p);
                    return userRepository.save(newCook);
                });

        // Find or create default Customer
        User customer = userRepository.findByEmail("ravindu@gmail.com")
                .or(() -> userRepository.findAll().stream().filter(u -> u.getRole() == UserRole.CUSTOMER).findFirst())
                .orElseGet(() -> {
                    User newCust = new User();
                    newCust.setEmail("customer.demo@neighborplates.com");
                    newCust.setPasswordHash(passwordEncoder.encode("cust123"));
                    newCust.setRole(UserRole.CUSTOMER);
                    User.UserProfile p = new User.UserProfile();
                    p.setName("Ravindu Perera");
                    p.setPhone("+94 71 234 5678");
                    newCust.setProfile(p);
                    return userRepository.save(newCust);
                });

        // 1. Lamprais Delivery (Ready)
        Order o1 = new Order();
        o1.setOrderNumber("NP-" + System.currentTimeMillis() % 1000000 + "-LP");
        o1.setCustomerId(customer.getId());
        o1.setCookId(cook.getId());
        o1.setStatus(OrderStatus.READY);
        o1.setDeliveryMethod("RIDER");
        o1.setTotalAmount(1450.0);
        o1.setPlatformFee(72.5);
        o1.setCookEarnings(1377.5);
        o1.setRiderEarnings(217.5);
        o1.setSpecialInstructions("Thermal bag required. Keep warm.");
        o1.setScheduledFor(Instant.now().plusSeconds(1800));
        o1.setCreatedAt(Instant.now());
        o1.setUpdatedAt(Instant.now());
        o1.setItems(List.of(
                new Order.OrderItem("m1", "Dutch-Burgher Lamprais Special", 1250.0, 1),
                new Order.OrderItem("m2", "Fresh Passion Fruit Juice", 200.0, 1)
        ));
        Order.DeliveryAddress a1 = new Order.DeliveryAddress();
        a1.setLabel("45 High Level Road, Nugegoda");
        a1.setCoordinates(List.of(79.8837, 6.8724));
        o1.setAddress(a1);
        orderRepository.save(o1);

        // 2. Crispy Chicken Kottu (Ready)
        Order o2 = new Order();
        o2.setOrderNumber("NP-" + (System.currentTimeMillis() + 1) % 1000000 + "-KT");
        o2.setCustomerId(customer.getId());
        o2.setCookId(cook.getId());
        o2.setStatus(OrderStatus.READY);
        o2.setDeliveryMethod("RIDER");
        o2.setTotalAmount(1200.0);
        o2.setPlatformFee(60.0);
        o2.setCookEarnings(1140.0);
        o2.setRiderEarnings(180.0);
        o2.setSpecialInstructions("Call on arrival at the gate.");
        o2.setScheduledFor(Instant.now().plusSeconds(2400));
        o2.setCreatedAt(Instant.now());
        o2.setUpdatedAt(Instant.now());
        o2.setItems(List.of(
                new Order.OrderItem("m3", "Spicy Chicken Cheese Kottu", 1200.0, 1)
        ));
        Order.DeliveryAddress a2 = new Order.DeliveryAddress();
        a2.setLabel("12/A Flower Road, Colombo 07");
        a2.setCoordinates(List.of(79.8612, 6.9271));
        o2.setAddress(a2);
        orderRepository.save(o2);

        // 3. String Hoppers & Kiri Hodi (Preparing)
        Order o3 = new Order();
        o3.setOrderNumber("NP-" + (System.currentTimeMillis() + 2) % 1000000 + "-SH");
        o3.setCustomerId(customer.getId());
        o3.setCookId(cook.getId());
        o3.setStatus(OrderStatus.PREPARING);
        o3.setDeliveryMethod("RIDER");
        o3.setTotalAmount(850.0);
        o3.setPlatformFee(42.5);
        o3.setCookEarnings(807.5);
        o3.setRiderEarnings(150.0);
        o3.setSpecialInstructions("Fresh off the steamer. Handle soup container with care.");
        o3.setScheduledFor(Instant.now().plusSeconds(1200));
        o3.setCreatedAt(Instant.now());
        o3.setUpdatedAt(Instant.now());
        o3.setItems(List.of(
                new Order.OrderItem("m4", "String Hoppers Set (15 pcs) + Pol Sambol & Dhal", 850.0, 1)
        ));
        Order.DeliveryAddress a3 = new Order.DeliveryAddress();
        a3.setLabel("88 Galle Road, Mount Lavinia");
        a3.setCoordinates(List.of(79.8654, 6.8420));
        o3.setAddress(a3);
        orderRepository.save(o3);

        logger.info("Successfully seeded live dispatch orders for riders.");
    }
}
