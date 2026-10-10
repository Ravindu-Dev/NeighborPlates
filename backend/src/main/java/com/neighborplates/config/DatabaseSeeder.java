package com.neighborplates.config;

import com.neighborplates.model.User;
import com.neighborplates.model.enums.UserRole;
import com.neighborplates.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        seedAdminUser();
        seedRiderUser();
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
}
