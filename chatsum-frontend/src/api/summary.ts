import { apiBaseUrl } from "./client";

export type GenerateSummaryResponse = {
    summary: string;
};

export async function generateSummary(chatText: string): Promise<GenerateSummaryResponse> {
    const url = apiBaseUrl
        ? new URL("/generate-summary", apiBaseUrl).toString()
        : "/backend/generate-summary"; // via Vite proxy

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text: chatText }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${url} failed: ${res.status} ${res.statusText}\n${text}`);
    }

    return (await res.json()) as GenerateSummaryResponse;
}
