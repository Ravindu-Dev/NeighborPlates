package com.neighborplates.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {

    private String replyText;

    private String sessionId;

    @Builder.Default
    private List<RichCard> cards = new ArrayList<>();

    @Builder.Default
    private List<String> suggestedPrompts = new ArrayList<>();
}
