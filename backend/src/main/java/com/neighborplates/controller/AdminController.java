package com.neighborplates.controller;

import com.neighborplates.dto.response.AdminAnalyticsResponse;
import com.neighborplates.model.User;
import com.neighborplates.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')") // Enforce admin-only access on class level
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = adminService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<User> verifyCook(@PathVariable String id) {
        User user = adminService.verifyCook(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/analytics")
    public ResponseEntity<AdminAnalyticsResponse> getPlatformAnalytics() {
        AdminAnalyticsResponse response = adminService.getPlatformAnalytics();
        return ResponseEntity.ok(response);
    }
}
