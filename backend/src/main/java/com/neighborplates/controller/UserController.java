package com.neighborplates.controller;

import com.neighborplates.dto.request.ChangePasswordRequest;
import com.neighborplates.dto.response.ApiResponse;
import com.neighborplates.dto.response.FavoriteToggleResponse;
import com.neighborplates.dto.response.MealResponse;
import com.neighborplates.model.User;
import com.neighborplates.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<User> getOwnProfile(Principal principal) {
        User user = userService.getOwnProfile(principal.getName());
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<User> updateProfile(@RequestBody User.UserProfile profile, Principal principal) {
        User user = userService.updateProfile(principal.getName(), profile);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/cooks/{id}")
    public ResponseEntity<User> getCookProfile(@PathVariable String id) {
        User cook = userService.getCookProfile(id);
        return ResponseEntity.ok(cook);
    }

    @PostMapping("/favorites/{mealId}")
    public ResponseEntity<FavoriteToggleResponse> toggleFavorite(@PathVariable String mealId, Principal principal) {
        FavoriteToggleResponse response = userService.toggleFavorite(principal.getName(), mealId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/favorites")
    public ResponseEntity<List<MealResponse>> getFavoriteMeals(Principal principal) {
        List<MealResponse> response = userService.getFavoriteMeals(principal.getName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request, Principal principal) {
        userService.changePassword(principal.getName(), request);
        return ResponseEntity.ok(new ApiResponse(true, "Password changed successfully"));
    }
}
