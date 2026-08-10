package com.neighborplates.controller;

import com.neighborplates.model.User;
import com.neighborplates.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/riders")
public class RiderController {

    private final UserService userService;

    public RiderController(UserService userService) {
        this.userService = userService;
    }

    @PutMapping("/availability")
    public ResponseEntity<User> toggleAvailability(
            @RequestParam boolean isAvailable,
            Principal principal) {
        User user = userService.toggleRiderAvailability(principal.getName(), isAvailable);
        return ResponseEntity.ok(user);
    }
}
