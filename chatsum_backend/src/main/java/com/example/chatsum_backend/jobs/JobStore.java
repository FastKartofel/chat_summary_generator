package com.example.chatsum_backend.jobs;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class JobStore {
    private final Map<String, HandoffJob> jobs = new ConcurrentHashMap<>();

    public HandoffJob create(String id) {
        HandoffJob job = new HandoffJob(id);
        jobs.put(id, job);
        return job;
    }

    public Optional<HandoffJob> get(String id) {
        return Optional.ofNullable(jobs.get(id));
    }
}
