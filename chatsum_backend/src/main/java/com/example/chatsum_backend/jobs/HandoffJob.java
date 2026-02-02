package com.example.chatsum_backend.jobs;

import com.example.chatsum_backend.api.dto.HandoffResponse;

import java.time.Instant;

public class HandoffJob {
    public enum Status { QUEUED, RUNNING, SUCCEEDED, FAILED }

    private final String id;
    private volatile Status status;
    private volatile int progress;
    private volatile String message;

    private final Instant createdAt = Instant.now();
    private volatile Instant updatedAt = Instant.now();

    private volatile HandoffResponse result;
    private volatile String error;

    public HandoffJob(String id) {
        this.id = id;
        this.status = Status.QUEUED;
        this.progress = 0;
        this.message = "Queued…";
    }

    // Current accessors (your style)
    public String id() { return id; }
    public Status status() { return status; }
    public int progress() { return progress; }
    public String message() { return message; }
    public Instant createdAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }
    public HandoffResponse result() { return result; }
    public String error() { return error; }

    public int getProgress() { return progress; }
    public String getMessage() { return message; }

    public void setRunning(String msg) {
        status = Status.RUNNING;
        message = msg;
        touch();
    }

    public void setProgress(int p, String msg) {
        int clamped = Math.max(0, Math.min(100, p));
        if (clamped < this.progress) clamped = this.progress;

        this.progress = clamped;
        this.message = msg;
        touch();
    }

    public void succeed(HandoffResponse r) {
        status = Status.SUCCEEDED;
        progress = 100;
        message = "Done";
        result = r;
        touch();
    }

    public void fail(String err) {
        status = Status.FAILED;
        message = "Failed";
        error = err;
        touch();
    }

    private void touch() {
        updatedAt = Instant.now();
    }
}
