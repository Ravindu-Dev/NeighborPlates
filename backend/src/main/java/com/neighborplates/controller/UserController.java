package com.neighborplates.controller;

import com.neighborplates.model.User;
import com.neighborplates.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

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
}
