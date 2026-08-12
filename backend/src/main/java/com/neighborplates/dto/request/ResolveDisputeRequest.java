package com.neighborplates.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolveDisputeRequest {

    @NotBlank(message = "Action is required (REFUND, REASSIGN, DISMISS, FORCE_CANCEL)")
    private String action; // "REFUND", "REASSIGN", "DISMISS", "FORCE_CANCEL"

    private String adminNotes;

    private String newRiderId;
}
