package com.example.chatsum_backend.api.dto;

public record HandoffResponse(
        String handoffSummary,
        String currentState,
        String seedPrompt,
        String neededContext
) {}