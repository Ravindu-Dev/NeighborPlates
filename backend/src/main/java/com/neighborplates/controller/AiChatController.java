package com.neighborplates.controller;

import com.neighborplates.dto.ai.AiChatRequest;
import com.neighborplates.dto.ai.AiChatResponse;
import com.neighborplates.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chatWithAi(
            @RequestBody AiChatRequest request,
            Authentication authentication) {

        String userId = null;
        if (authentication != null && authentication.isAuthenticated()) {
            userId = authentication.getName(); // Extracted from JWT principal
        }

        AiChatResponse response = aiChatService.processUserQuery(request, userId);
        return ResponseEntity.ok(response);
    }
}
