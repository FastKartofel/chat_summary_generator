package com.example.chatsum_backend.api.dto;

public record HandoffJobResponse(
        String jobId,
        String status,
        int progress,
        String message,
        String error,
        Object result
) {}
