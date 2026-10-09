package com.neighborplates.controller;

import com.neighborplates.dto.response.RiderSummaryResponse;
import com.neighborplates.model.User;
import com.neighborplates.service.RiderService;
import com.neighborplates.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/riders")
public class RiderController {

    private final UserService userService;
    private final RiderService riderService;

    public RiderController(UserService userService, RiderService riderService) {
        this.userService = userService;
        this.riderService = riderService;
    }

    @PutMapping("/availability")
    public ResponseEntity<User> toggleAvailability(
            @RequestParam boolean isAvailable,
            Principal principal) {
        User user = userService.toggleRiderAvailability(principal.getName(), isAvailable);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/summary")
    public ResponseEntity<RiderSummaryResponse> getSummary(Principal principal) {
        RiderSummaryResponse summary = riderService.getRiderSummary(principal.getName());
        return ResponseEntity.ok(summary);
    }
}

