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
}
