package com.neighborplates.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportDisputeRequest {

    @NotBlank(message = "Dispute reason is required")
    private String reason;

    private String details;
}
