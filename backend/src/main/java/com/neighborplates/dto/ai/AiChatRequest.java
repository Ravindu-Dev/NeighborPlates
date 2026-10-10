package com.neighborplates.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {

    private String message;

    private String sessionId;

    private List<ChatMessageHistory> history = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessageHistory {
        private String role; // "user", "assistant"
        private String content;
    }
}
