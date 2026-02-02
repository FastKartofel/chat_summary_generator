package com.example.chatsum_backend.jobs;

import com.example.chatsum_backend.api.dto.HandoffRequest;
import com.example.chatsum_backend.api.dto.HandoffResponse;
import com.example.chatsum_backend.application.HandoffService;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import org.springframework.scheduling.TaskScheduler;




@Service
public class HandoffJobService {

    private final JobStore store;
    private final HandoffService handoffService;
    private final Executor handoffExecutor;

    private final TaskScheduler taskScheduler;

    // Small scheduler only for progress updates while waiting
    private final ScheduledExecutorService progressScheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "handoff-progress");
                t.setDaemon(true);
                return t;
            });

    public HandoffJobService(JobStore store, HandoffService handoffService, Executor handoffExecutor, TaskScheduler taskScheduler) {
        this.store = store;
        this.handoffService = handoffService;
        this.handoffExecutor = handoffExecutor;
        this.taskScheduler = taskScheduler;
    }

    public String enqueue(HandoffRequest req) {
        String id = UUID.randomUUID().toString();
        HandoffJob job = store.create(id);

        CompletableFuture.runAsync(() -> runJob(job, req), handoffExecutor);

        return id;
    }

    private void runJob(HandoffJob job, HandoffRequest req) {
        try {
            // 0️⃣ Job accepted
            job.setProgress(0, "Queued…");
            job.setRunning("Starting…");

            // 1️⃣ These are REAL pipeline stages (even if timing is approximate)
            job.setProgress(5, "Parsing transcript");
            job.setProgress(10, "Chunking transcript");
            job.setProgress(15, "Summarizing conversation");

            // 🔥 Long-running operation (OpenAI calls happen inside here)
            HandoffResponse res = handoffService.generate(
                    req.transcript(),
                    req.targetModel(),
                    req.developerMode()
            );

            // 2️⃣ Finalization stages
            job.setProgress(70, "Merging summaries");
            job.setProgress(85, "Building seed prompt");
            job.setProgress(95, "Finalizing output");

            // 3️⃣ Done
            job.succeed(res); // sets progress=100 internally
        } catch (Exception e) {
            job.fail(e.getMessage());
        }
    }

    private ScheduledFuture<?> startProgressTicker(HandoffJob job) {

        final String[] messages = {
                "Summarizing chunks",
                "Extracting key decisions",
                "Building handoff sections",
                "Drafting current state",
                "Assembling seed prompt context",
                "Formatting output"
        };

        Runnable task = new Runnable() {
            int step = 0;

            @Override
            public void run() {
                try {
                    int current = job.getProgress();
                    if (current >= 85) return;

                    int next = Math.min(85, current + 1);
                    String msg = messages[step % messages.length];
                    step++;

                    job.setProgress(next, msg);
                } catch (Exception ignored) {
                    // never crash scheduler thread
                }
            }
        };

        return taskScheduler.scheduleAtFixedRate(
                task,
                Duration.ofMillis(700)
        );
    }
}
