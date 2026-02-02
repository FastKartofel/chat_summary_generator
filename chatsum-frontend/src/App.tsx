import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedBackground from "./components/AnimatedBackground";
import { apiBaseUrl, getJson } from "./api/client";
import { createHandoffJob, getHandoffJob } from "./api/handoffJobs";

const SITE_NAME = "ContextFlow";

type Theme = "dark" | "ocean";
function applyTheme(theme: Theme) {
    if (theme === "dark") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
}

/** Typewriter hook */
function useTypewriter(text: string, start: boolean, speedMs = 16) {
    const [out, setOut] = useState("");
    useEffect(() => {
        if (!start) return;
        setOut("");
        let i = 0;
        const id = window.setInterval(() => {
            i++;
            setOut(text.slice(0, i));
            if (i >= text.length) window.clearInterval(id);
        }, speedMs);
        return () => window.clearInterval(id);
    }, [text, start, speedMs]);
    return out;
}

export default function App() {
    // Theme
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("theme");
        return saved === "dark" || saved === "ocean" ? (saved as Theme) : "ocean";
    });
    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    // ✅ Developer Mode toggle
    const [devMode, setDevMode] = useState(false);

    // App state
    const [backendStatus, setBackendStatus] = useState<string>("Checking…");
    const [transcript, setTranscript] = useState("");

    // ✅ target model (only for sizing seed prompt)
    const [targetModel, setTargetModel] = useState("gpt-4o");

    const [handoffSummary, setHandoffSummary] = useState("");
    const [currentState, setCurrentState] = useState("");
    const [seedPrompt, setSeedPrompt] = useState("");
    const [neededContext, setNeededContext] = useState(""); // ✅ Dev mode extra card

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // show output only after first generation attempt
    const [showOutput, setShowOutput] = useState(false);

    const charCount = useMemo(() => transcript.length, [transcript]);

    const outputRef = useRef<HTMLDivElement | null>(null);
    const aboutRef = useRef<HTMLDivElement | null>(null);

    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState<number>(0);
    const [jobMessage, setJobMessage] = useState<string>("");

    // ✅ cancel token for polling (prevents old mode results from updating state)
    const pollCancelRef = useRef(0);

    // ✅ Reset everything when switching modes / starting a "new session"
    function resetSession() {
        // cancel any in-flight polling
        pollCancelRef.current += 1;

        setError(null);

        setHandoffSummary("");
        setCurrentState("");
        setSeedPrompt("");
        setNeededContext("");

        setIsLoading(false);
        setShowOutput(false);

        setJobId(null);
        setJobStatus(null);
        setJobProgress(0);
        setJobMessage("");
    }

    // About typing only when visible
    const [aboutVisible, setAboutVisible] = useState(false);
    useEffect(() => {
        const el = aboutRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setAboutVisible(true);
                    obs.disconnect();
                }
            },
            { threshold: 0.25 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await getJson<any>("/actuator/health");
                setBackendStatus(res.status ?? "UP");
            } catch {
                setBackendStatus("DOWN");
            }
        })();
    }, []);

    async function onGenerate() {
        // start a "fresh session" for each generate click too
        resetSession();

        if (!transcript.trim()) {
            setError("Paste some chat transcript first.");
            return;
        }

        // reveal output and scroll immediately
        setShowOutput(true);
        setTimeout(() => {
            outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);

        setIsLoading(true);

        // capture cancel token for this run
        const cancelToken = pollCancelRef.current;

        try {
            // 1) Create async job
            const { jobId } = await createHandoffJob(transcript, targetModel, devMode);

            // if mode was switched while request was in-flight, stop
            if (pollCancelRef.current !== cancelToken) return;

            setJobId(jobId);
            setJobStatus("QUEUED");
            setJobProgress(0);
            setJobMessage("Queued…");

            // 2) Poll until finished
            while (true) {
                // stop if user switched mode / reset session
                if (pollCancelRef.current !== cancelToken) return;

                const job = await getHandoffJob(jobId);

                if (pollCancelRef.current !== cancelToken) return;

                setJobStatus(job.status);
                setJobProgress(job.progress ?? 0);
                setJobMessage(job.message ?? "");

                if (job.status === "SUCCEEDED") {
                    const res = job.result!;

                    setHandoffSummary(res.handoffSummary ?? "");
                    setCurrentState(res.currentState ?? "");
                    setSeedPrompt(res.seedPrompt ?? "");
                    setNeededContext(res.neededContext ?? "");
                    break;
                }

                if (job.status === "FAILED") {
                    throw new Error(job.error || "Handoff job failed.");
                }

                // wait before next poll
                await new Promise((r) => setTimeout(r, 1000));
            }
        } catch (e: any) {
            // avoid showing errors if session was cancelled
            if (pollCancelRef.current !== cancelToken) return;
            setError(e?.message ?? String(e));
        } finally {
            // avoid flipping loading off if session was cancelled
            if (pollCancelRef.current !== cancelToken) return;
            setIsLoading(false);
        }
    }

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // ignore
        }
    }

    function downloadTxt(filename: string, content: string) {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        a.remove();
        URL.revokeObjectURL(url);
    }


    // About text
    const aboutText = `ContextFlow turns messy conversations into a clean developer handoff.

• Paste a transcript and generate:
  - Handoff Summary: the essentials, decisions, and deliverables
  - Current State: what’s done, what’s pending, and what to verify next
  - Seed Prompt: a ready-to-use prompt to continue work

Use it when:
• you’re switching tasks and need to resume fast
• you’re handing work to someone else
• you want continuity without re-reading long chats

Privacy note: keep sensitive data out of transcripts whenever possible.`;

    const typedAbout = useTypewriter(aboutText, aboutVisible, 14);

    const hasResults = !!(handoffSummary || currentState || seedPrompt || neededContext);

    const exportText = useMemo(() => {
        const lines: string[] = [];

        lines.push("ContextFlow Export");
        lines.push(`Mode: ${devMode ? "Developer" : "Normal"}`);
        lines.push(`Model sizing target: ${targetModel}`);
        lines.push(`Generated at: ${new Date().toISOString()}`);
        lines.push("");

        if (handoffSummary) {
            lines.push("=== HANDOFF SUMMARY ===");
            lines.push(handoffSummary.trim());
            lines.push("");
        }

        if (currentState) {
            lines.push("=== CURRENT STATE ===");
            lines.push(currentState.trim());
            lines.push("");
        }

        if (seedPrompt) {
            lines.push("=== SEED PROMPT ===");
            lines.push(seedPrompt.trim());
            lines.push("");
        }

        if (devMode && neededContext) {
            lines.push("=== NEEDED CONTEXT (PASTE NEXT) ===");
            lines.push(neededContext.trim());
            lines.push("");
        }

        return lines.join("\n");
    }, [devMode, targetModel, handoffSummary, currentState, seedPrompt, neededContext]);

    // Live previews while loading (typewriter)
    const previewSummaryText =
        "Generating a concise handoff summary…\n\nYou’ll get: key decisions, deliverables, and the most important context needed to continue without rereading the whole chat.";
    const previewStateText =
        "Deriving the current project state…\n\nYou’ll get: what’s implemented, what’s working, what’s missing, blockers, and the most important checks to run next.";
    const previewSeedText =
        "Crafting a strong seed prompt…\n\nYou’ll get: a ready-to-paste prompt that restates goals, constraints, and the next tasks—so the next session starts fast.";
    const previewNeededText =
        "Scanning for missing project context…\n\nYou’ll get: a checklist of files/classes to paste next so the new chat has enough code to continue.";

    const typedPreviewSummary = useTypewriter(previewSummaryText, showOutput && isLoading, 12);
    const typedPreviewState = useTypewriter(previewStateText, showOutput && isLoading, 12);
    const typedPreviewSeed = useTypewriter(previewSeedText, showOutput && isLoading, 12);
    const typedPreviewNeeded = useTypewriter(previewNeededText, showOutput && isLoading && devMode, 12);

    return (
        <>
            <style>
                {`
          @keyframes zap {
            0% { transform: translateY(0) scale(1); opacity: 0.9; }
            50% { transform: translateY(-2px) scale(1.08); opacity: 1; }
            100% { transform: translateY(0) scale(1); opacity: 0.9; }
          }
        `}
            </style>

            {/* ✅ Water or Matrix depending on devMode */}
            <AnimatedBackground isLoading={isLoading} mode={devMode ? "matrix" : "water"} />

            <div className="shell">
                <div className="glass navbar">
                    <div className="brand">
                        <div className="logo">{SITE_NAME}</div>
                        <div className="tag">handoff + seed prompt generator</div>
                    </div>

                    <div className="navlinks">
                        <a
                            href="#generate"
                            onClick={(e) => {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                        >
                            Generate
                        </a>
                        <a
                            href="#about"
                            onClick={(e) => {
                                e.preventDefault();
                                aboutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                        >
                            About
                        </a>

                        {/* ✅ Dev Mode toggle (now resets session on switch) */}
                        <div
                            className="devToggle"
                            role="switch"
                            aria-checked={devMode}
                            onClick={() => {
                                resetSession();
                                setDevMode((v) => !v);
                            }}
                            title="Toggle developer mode"
                        >
                            <span className="devLabel">Dev Mode</span>
                            <span className={`devPill ${devMode ? "on" : ""}`}>
                <span className="devKnob" />
              </span>
                        </div>
                    </div>
                </div>

                <div className="hero" id="generate">
                    <h1>Approachable Intelligence</h1>
                    <p>Paste a chat, get a clean developer handoff + a strong seed prompt for continuation.</p>
                    <p className="small">
                        API: <span className="mono">{apiBaseUrl || "(via Vite proxy)"}</span> • Backend:{" "}
                        <strong>{backendStatus}</strong>
                    </p>
                </div>

                {/* Minimal input card */}
                <div className="glass card" style={{ maxWidth: 920, margin: "0 auto" }}>
                    <h2>Paste chat history for prompt generation</h2>

                    <textarea
                        className="mono"
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder={`Example:\nUser: ...\nAssistant: ...`}
                        rows={12}
                    />

                    {/* ✅ Model picker (optional: reset session on model change) */}
                    <div className="modelPicker">
                        <div className="modelPickerLabel">Seed prompt will be sized to fit one paste into:</div>

                        <div className="modelPickerOptions">
                            {[
                                ["gpt-4o", "GPT-4o"],
                                ["gpt-4o-mini", "GPT-4o mini"],
                                ["gpt-4.1", "GPT-4.1"],
                                ["gpt-5.2", "GPT-5.2"],
                            ].map(([value, label]) => (
                                <label className="modelOpt" key={value}>
                                    <input
                                        type="radio"
                                        name="targetModel"
                                        value={value}
                                        checked={targetModel === value}
                                        onChange={(e) => {
                                            // recommended: changing model = new session
                                            resetSession();
                                            setTargetModel(e.target.value);
                                        }}
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="row" style={{ alignItems: "center" }}>
                        <span className="badge">{charCount} characters</span>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {/* Live status text beside the button */}
                            {isLoading && (
                                <div className="small" style={{ textAlign: "right", minWidth: 220 }}>
                                    <div style={{ opacity: 0.9 }}>
                                        {jobMessage || "Working…"}{" "}
                                        <span style={{ opacity: 0.7 }}>({jobProgress || 0}%)</span>
                                    </div>

                                    {jobStatus && (
                                        <div style={{ marginTop: 6, opacity: 0.8 }}>
                                            Status: <span className="mono">{jobStatus}</span>
                                            {jobId ? <span style={{ opacity: 0.7 }}> • {jobId}</span> : null}
                                        </div>
                                    )}

                                    <div
                                        style={{
                                            marginTop: 6,
                                            height: 6,
                                            width: 220,
                                            borderRadius: 999,
                                            background: "rgba(255,255,255,0.12)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: "100%",
                                                width: `${Math.min(100, Math.max(0, jobProgress || 0))}%`,
                                                background: "rgba(255,255,255,0.45)",
                                                transition: "width 300ms ease",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button onClick={onGenerate} disabled={isLoading} aria-busy={isLoading}>
                                {isLoading ? "Generating…" : "Generate handoff"}
                            </button>
                        </div>
                    </div>

                    {error && <div className="error">{error}</div>}
                </div>

                {/* Output section */}
                {showOutput && (
                    <div ref={outputRef} id="output" style={{ marginTop: 18 }} className="reveal">

                        {/* 🔽 ADD THIS BLOCK */}
                        <div className="row" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
                            <button
                                onClick={() =>
                                    downloadTxt(
                                        `contextflow-${devMode ? "dev" : "normal"}-${Date.now()}.txt`,
                                        exportText
                                    )
                                }
                                disabled={!hasResults}
                            >
                                Download
                            </button>
                        </div>
                        {/* 🔼 END ADD */}

                        {isLoading && !hasResults && (
                            <div className="glass card generatingPanel">
                                <div className="generatingIcon">⚡</div>
                                <div className="generatingTitle">Generating your handoff…</div>
                                <div className="generatingSub">This usually takes a few seconds.</div>
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                            {/* Handoff Summary + Current State cards */}
                            <div className="glass-solid card output">
                                <div className="row" style={{ marginTop: 0 }}>
                                    <h2 style={{ margin: 0 }}>Handoff Summary</h2>
                                    <button onClick={() => copy(handoffSummary)} disabled={!handoffSummary}>
                                        Copy
                                    </button>
                                </div>
                                <div className="cardBody">
                                    {handoffSummary ? (
                                        <pre className="mono">{handoffSummary}</pre>
                                    ) : isLoading ? (
                                        <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                      {typedPreviewSummary}
                                            <span style={{ opacity: 0.55 }}>
                        {typedPreviewSummary.length < previewSummaryText.length ? "▍" : ""}
                      </span>
                    </pre>
                                    ) : (
                                        <p className="small">Generate to see the handoff summary.</p>
                                    )}
                                </div>
                            </div>

                            <div className="glass-solid card output">
                                <div className="row" style={{ marginTop: 0 }}>
                                    <h2 style={{ margin: 0 }}>Current State</h2>
                                    <button onClick={() => copy(currentState)} disabled={!currentState}>
                                        Copy
                                    </button>
                                </div>
                                <div className="cardBody">
                                    {currentState ? (
                                        <pre className="mono">{currentState}</pre>
                                    ) : isLoading ? (
                                        <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                      {typedPreviewState}
                                            <span style={{ opacity: 0.55 }}>
                        {typedPreviewState.length < previewStateText.length ? "▍" : ""}
                      </span>
                    </pre>
                                    ) : (
                                        <p className="small">Generate to see the current state.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="glass card output" style={{ marginTop: 16 }}>
                            <div className="row" style={{ marginTop: 0 }}>
                                <h2 style={{ margin: 0 }}>Seed Prompt</h2>
                                <button onClick={() => copy(seedPrompt)} disabled={!seedPrompt}>
                                    Copy
                                </button>
                            </div>
                            <div className="cardBody">
                                {seedPrompt ? (
                                    <pre className="mono">{seedPrompt}</pre>
                                ) : isLoading ? (
                                    <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                    {typedPreviewSeed}
                                        <span style={{ opacity: 0.55 }}>
                      {typedPreviewSeed.length < previewSeedText.length ? "▍" : ""}
                    </span>
                  </pre>
                                ) : (
                                    <p className="small">Generate to see the seed prompt.</p>
                                )}
                            </div>
                        </div>

                        {/* ✅ ONLY in Dev Mode */}
                        {devMode && (
                            <div className="glass-solid card output" style={{ marginTop: 16 }}>
                                <div className="row" style={{ marginTop: 0 }}>
                                    <h2 style={{ margin: 0 }}>Needed Context (paste next)</h2>
                                    <button onClick={() => copy(neededContext)} disabled={!neededContext}>
                                        Copy
                                    </button>
                                </div>
                                <div className="cardBody">
                                    {neededContext ? (
                                        <pre className="mono">{neededContext}</pre>
                                    ) : isLoading ? (
                                        <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                      {typedPreviewNeeded}
                                            <span style={{ opacity: 0.55 }}>
                        {typedPreviewNeeded.length < previewNeededText.length ? "▍" : ""}
                      </span>
                    </pre>
                                    ) : (
                                        <p className="small">Enable Dev Mode and generate to see needed context.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* About */}
                <div ref={aboutRef} id="about" className="glass card" style={{ marginTop: 18 }}>
                    <h2>About</h2>
                    <pre className="mono" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {typedAbout}
                        <span style={{ opacity: 0.55 }}>{aboutVisible && typedAbout.length < aboutText.length ? "▍" : ""}</span>
          </pre>
                </div>
            </div>

            {/* Floating theme toggle */}
            <div className="glass fab-toggle">
                <div className="toggle-label">{theme === "ocean" ? "Ocean" : "Dark"}</div>
                <div
                    className="toggle"
                    role="switch"
                    aria-checked={theme === "dark"}
                    tabIndex={0}
                    onClick={() => setTheme((t) => (t === "ocean" ? "dark" : "ocean"))}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setTheme((t) => (t === "ocean" ? "dark" : "ocean"));
                        }
                    }}
                    title="Toggle theme"
                >
                    <div className="toggle-knob" />
                </div>
            </div>
        </>
    );
}
