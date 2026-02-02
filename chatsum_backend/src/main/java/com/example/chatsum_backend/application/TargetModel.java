package com.example.chatsum_backend.application;

import java.util.Locale;

public enum TargetModel {
    GPT_4O("gpt-4o", ModelLimits.tokensFor("gpt-4o")),
    GPT_4O_MINI("gpt-4o-mini", ModelLimits.tokensFor("gpt-4o-mini")),
    GPT_4_1("gpt-4.1", ModelLimits.tokensFor("gpt-4.1")),
    GPT_5_2("gpt-5.2", ModelLimits.tokensFor("gpt-5.2"));

    public final String apiName;
    public final int maxInputTokens;

    TargetModel(String apiName, int maxInputTokens) {
        this.apiName = apiName;
        this.maxInputTokens = maxInputTokens;
    }

    public static TargetModel fromNullable(String s) {
        if (s == null || s.isBlank()) return GPT_4O;
        String x = s.trim().toLowerCase(Locale.ROOT);
        return switch (x) {
            case "gpt-4o" -> GPT_4O;
            case "gpt-4o-mini" -> GPT_4O_MINI;
            case "gpt-4.1" -> GPT_4_1;
            case "gpt-5.2" -> GPT_5_2;
            default -> GPT_4O;
        };
    }
}
