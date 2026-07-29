package com.neighborplates.service;

import com.neighborplates.dto.request.LoginRequest;
import com.neighborplates.dto.request.RegisterRequest;
import com.neighborplates.dto.response.AuthResponse;
import com.neighborplates.exception.UnauthorizedException;
import com.neighborplates.model.User;
import com.neighborplates.repository.UserRepository;
import com.neighborplates.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());

        User.UserProfile profile = new User.UserProfile();
        profile.setName(request.getName());
        profile.setPhone(request.getPhone());
        profile.setBio(request.getBio());
        profile.setDeliveryRadius(request.getDeliveryRadius());
        profile.setHygieneVerified(false);

        if (request.getCoordinates() != null && request.getCoordinates().size() == 2) {
            User.GeoJsonPoint point = new User.GeoJsonPoint();
            point.setCoordinates(request.getCoordinates());
            profile.setLocation(point);
        } else {
            User.GeoJsonPoint point = new User.GeoJsonPoint();
            // Default coordinate fallback [0.0, 0.0]
            point.setCoordinates(new ArrayList<>());
            point.getCoordinates().add(0.0);
            point.getCoordinates().add(0.0);
            profile.setLocation(point);
        }

        user.setProfile(profile);
        user.setStats(new User.UserStats());
        user.setFavorites(new ArrayList<>());
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);

        // Perform automatic login after registration
        return login(new LoginRequest(request.getEmail(), request.getPassword()));
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("User not found after authentication"));

        return new AuthResponse(
                jwt,
                refreshToken,
                user.getId(),
                user.getProfile().getName(),
                user.getEmail(),
                user.getRole().name()
        );
    }

    public AuthResponse refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        String email = tokenProvider.getUserEmailFromJWT(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found for token"));

        String newAccessToken = tokenProvider.generateTokenFromEmail(email, 86400000); // 24 hours
        
        return new AuthResponse(
                newAccessToken,
                refreshToken,
                user.getId(),
                user.getProfile().getName(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}
