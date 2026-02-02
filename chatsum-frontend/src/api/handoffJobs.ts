import { apiUrl, readError } from "./client";

export type HandoffRequest = {
    transcript: string;
    targetModel: string;
    developerMode: boolean;
};

export type HandoffResponse = {
    handoffSummary: string;
    currentState: string;
    seedPrompt: string;
    neededContext: string;
};

export type HandoffJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type HandoffJob = {
    jobId: string;
    status: HandoffJobStatus;
    progress: number;
    message: string;
    error?: string | null;
    result?: HandoffResponse | null;
};

export async function createHandoffJob(
    transcript: string,
    targetModel: string,
    developerMode: boolean
): Promise<{ jobId: string }> {
    const url = apiUrl("/api/handoff/jobs");
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ transcript, targetModel, developerMode } satisfies HandoffRequest),
    });

    if (!res.ok) throw new Error(`POST ${url} failed: ${await readError(res)}`);
    return (await res.json()) as { jobId: string };
}

export async function getHandoffJob(jobId: string): Promise<HandoffJob> {
    const url = apiUrl(`/api/handoff/jobs/${jobId}`);
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`GET ${url} failed: ${await readError(res)}`);
    return (await res.json()) as HandoffJob;
}
