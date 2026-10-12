package com.neighborplates.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteToggleResponse {
    private boolean favorited;
    private String mealId;
    private List<String> favorites;
}
