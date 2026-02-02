// src/api/client.ts
export const apiBaseUrl: string = (import.meta as any).env?.VITE_API_BASE_URL ?? "";

/**
 * Build a URL that works in both cases:
 * - apiBaseUrl set -> call backend directly (e.g. http://localhost:8080)
 * - apiBaseUrl empty -> use Vite proxy (/backend -> http://localhost:8080)
 */
export function apiUrl(path: string): string {
    if (apiBaseUrl) return new URL(path, apiBaseUrl).toString();
    return `/backend${path}`; // your Vite proxy prefix
}

type ProblemDetail = {
    title?: string;
    detail?: string;
    status?: number;
};

export async function readError(res: Response): Promise<string> {
    const ct = res.headers.get("content-type") || "";

    // Spring ProblemDetail is usually application/problem+json
    if (ct.includes("application/problem+json") || ct.includes("application/json")) {
        try {
            const pd = (await res.json()) as ProblemDetail;
            const title = pd.title || res.statusText;
            const detail = pd.detail ? `\n${pd.detail}` : "";
            return `${res.status} ${title}${detail}`;
        } catch {
            // fall through
        }
    }

    const text = await res.text().catch(() => "");
    return `${res.status} ${res.statusText}${text ? `\n${text}` : ""}`;
}

export async function getJson<T>(path: string): Promise<T> {
    const url = apiUrl(path);

    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        throw new Error(`GET ${url} failed: ${await readError(res)}`);
    }

    return (await res.json()) as T;
}
