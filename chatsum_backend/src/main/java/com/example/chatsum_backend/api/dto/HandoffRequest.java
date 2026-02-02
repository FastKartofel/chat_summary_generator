package com.example.chatsum_backend.api.dto;

import jakarta.validation.constraints.NotBlank;

public record HandoffRequest(
        @NotBlank(message = "transcript must not be blank")
        String transcript,

        @NotBlank(message = "targetModel must not be blank")
        String targetModel,

        boolean developerMode
) {}
