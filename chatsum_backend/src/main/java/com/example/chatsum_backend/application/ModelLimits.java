package com.example.chatsum_backend.application;

import java.util.Map;

public final class ModelLimits {

    // Rough but safe char budgets (≈ 3.8 chars/token)
    public static final Map<String, Integer> MAX_TOKENS = Map.of(
            "gpt-4o", 128_000,
            "gpt-4o-mini", 32_000,
            "gpt-4.1", 64_000,
            "gpt-5.2", 200_000
    );

    public static int tokensFor(String model) {
        return MAX_TOKENS.getOrDefault(model, 32_000);
    }

    public static int charsFor(String model) {
        return (int) (tokensFor(model) * 3.8);
    }

    private ModelLimits() {}
}
