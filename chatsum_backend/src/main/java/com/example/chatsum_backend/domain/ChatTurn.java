package com.example.chatsum_backend.domain;

public record ChatTurn(Role role, String content) {
    public enum Role { USER, ASSISTANT, UNKNOWN }
}

