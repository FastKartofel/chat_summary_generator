package com.example.chatsum_backend.api.controller;

import com.example.chatsum_backend.api.dto.HandoffJobResponse;
import com.example.chatsum_backend.api.dto.HandoffRequest;
import com.example.chatsum_backend.jobs.HandoffJob;
import com.example.chatsum_backend.jobs.HandoffJobService;
import com.example.chatsum_backend.jobs.JobStore;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/handoff")
public class HandoffJobsController {

    private final HandoffJobService jobs;
    private final JobStore store;

    public HandoffJobsController(HandoffJobService jobs, JobStore store) {
        this.jobs = jobs;
        this.store = store;
    }

    @PostMapping("/jobs")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> createJob(@Valid @RequestBody HandoffRequest request) {
        String jobId = jobs.enqueue(request);
        return Map.of("jobId", jobId);
    }

    @GetMapping("/jobs/{jobId}")
    public HandoffJobResponse getJob(@PathVariable String jobId) {
        HandoffJob job = store.get(jobId).orElseThrow(() -> new JobNotFound(jobId));

        return new HandoffJobResponse(
                job.id(),
                job.status().name(),
                job.progress(),
                job.message(),
                job.error(),     // can be null ✅
                job.result()     // can be null ✅
        );
    }


    @ResponseStatus(HttpStatus.NOT_FOUND)
    private static class JobNotFound extends RuntimeException {
        public JobNotFound(String id) { super("Job not found: " + id); }
    }
}
