import {apiUrl, readError} from "./client.ts";

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

export async function generateHandoff(
    transcript: string,
    targetModel: string,
    developerMode: boolean
): Promise<HandoffResponse> {
    const url = apiUrl("/api/handoff");

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ transcript, targetModel, developerMode } satisfies HandoffRequest),
    });

    if (!res.ok) throw new Error(`POST ${url} failed: ${await readError(res)}`);
    return (await res.json()) as HandoffResponse;
}
