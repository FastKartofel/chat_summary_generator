package com.example.chatsum_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "openai")
public record OpenAiProperties(
        String apiKey,
        String model,
        Pricing pricing,
        Timeouts timeouts
) {
    public record Pricing(double inputPer1M, double outputPer1M) {}
    public record Timeouts(int connectSeconds, int requestSeconds) {}
}
