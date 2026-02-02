import { useEffect, useRef } from "react";

type Props = {
    isLoading?: boolean;
    mode: "water" | "matrix";
};

type Particle = { x: number; y: number; px: number; py: number; life: number };

// -------------------- WATER (your current one) --------------------
function hash(n: number) {
    return (Math.sin(n) * 43758.5453123) % 1;
}
function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}
function smoothstep(t: number) {
    return t * t * (3 - 2 * t);
}
function noise2(x: number, y: number) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const r1 = hash(xi * 127.1 + yi * 311.7);
    const r2 = hash((xi + 1) * 127.1 + yi * 311.7);
    const r3 = hash(xi * 127.1 + (yi + 1) * 311.7);
    const r4 = hash((xi + 1) * 127.1 + (yi + 1) * 311.7);

    const u = smoothstep(xf);
    const v = smoothstep(yf);

    return lerp(lerp(r1, r2, u), lerp(r3, r4, u), v);
}
function fbm(x: number, y: number) {
    let v = 0;
    let a = 0.55;
    let f = 1;
    for (let i = 0; i < 4; i++) {
        v += a * noise2(x * f, y * f);
        f *= 2;
        a *= 0.5;
    }
    return v;
}

// -------------------- MATRIX --------------------
type Drop = { y: number; speed: number; head: number; };

export default function AnimatedBackground({ isLoading = false, mode }: Props) {
    const waterRef = useRef<HTMLCanvasElement | null>(null);
    const matrixRef = useRef<HTMLCanvasElement | null>(null);

    // WATER state
    const particlesRef = useRef<Particle[]>([]);
    const pointerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, has: false });
    const waterTargetsRef = useRef({ tx: 0, ty: 0, lx: 0, ly: 0 });

    // MATRIX state
    const dropsRef = useRef<Drop[]>([]);
    const fontSizeRef = useRef(16);
    const columnsRef = useRef(0);

    useEffect(() => {
        // ---------- WATER init ----------
        const wCanvas = waterRef.current!;
        const wCtx = wCanvas.getContext("2d", { alpha: true })!;
        let wRaf = 0;

        const resizeWater = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            wCanvas.width = innerWidth * dpr;
            wCanvas.height = innerHeight * dpr;
            wCanvas.style.width = "100%";
            wCanvas.style.height = "100%";
            wCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = Math.min(1600, Math.floor((innerWidth * innerHeight) / 1400));
            particlesRef.current = Array.from({ length: count }, () => {
                const x = Math.random() * innerWidth;
                const y = Math.random() * innerHeight;
                return { x, y, px: x, py: y, life: 120 + Math.random() * 200 };
            });
        };

        const onMove = (e: PointerEvent) => {
            const t = waterTargetsRef.current;
            t.tx = e.clientX;
            t.ty = e.clientY;
            pointerRef.current.has = true;
        };
        const onLeave = () => (pointerRef.current.has = false);

        const drawWater = () => {
            const w = innerWidth;
            const h = innerHeight;
            const t = performance.now() * 0.001;
            const ocean = document.documentElement.dataset.theme === "ocean";

            // smooth pointer
            const pt = waterTargetsRef.current;
            pt.lx += (pt.tx - pt.lx) * 0.08;
            pt.ly += (pt.ty - pt.ly) * 0.08;

            pointerRef.current.vx = (pt.lx - pointerRef.current.x) * 0.04;
            pointerRef.current.vy = (pt.ly - pointerRef.current.y) * 0.04;
            pointerRef.current.x = pt.lx;
            pointerRef.current.y = pt.ly;

            // background
            const g = wCtx.createLinearGradient(0, 0, w, h);
            if (ocean) {
                g.addColorStop(0, "rgba(10,110,190,0.32)");
                g.addColorStop(0.5, "rgba(120,230,255,0.18)");
                g.addColorStop(1, "rgba(0,70,140,0.30)");
            } else {
                g.addColorStop(0, "rgba(12,14,24,0.96)");
                g.addColorStop(1, "rgba(0,0,0,0.98)");
            }
            wCtx.fillStyle = g;
            wCtx.fillRect(0, 0, w, h);

            // trails
            wCtx.globalCompositeOperation = "source-over";
            wCtx.fillStyle = ocean ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.14)";
            wCtx.fillRect(0, 0, w, h);

            const speed = isLoading ? 1.8 : 1.15;
            const scaleA = 0.0015;
            const scaleB = 0.0045;

            const pointer = pointerRef.current;
            const influenceR = 110;
            const strength = 42;

            wCtx.globalCompositeOperation = ocean ? "multiply" : "lighter";
            wCtx.lineCap = "round";

            for (const p of particlesRef.current) {
                p.px = p.x;
                p.py = p.y;

                const n =
                    fbm(p.x * scaleA, p.y * scaleA + t * 0.4) * 0.7 +
                    fbm(p.x * scaleB + t * 0.9, p.y * scaleB) * 0.3;

                const ang = n * Math.PI * 2;

                if (pointer.has) {
                    const dx = p.x - pointer.x;
                    const dy = p.y - pointer.y;
                    const d = Math.hypot(dx, dy);
                    if (d < influenceR) {
                        const s = 1 - d / influenceR;
                        p.x += pointer.vx * s * strength;
                        p.y += pointer.vy * s * strength;
                    }
                }

                p.x += Math.cos(ang) * speed;
                p.y += Math.sin(ang) * speed;
                p.life--;

                wCtx.strokeStyle = ocean ? "rgba(25, 85, 150, 0.22)" : "rgba(180, 210, 255, 0.16)";
                wCtx.lineWidth = ocean ? 1.7 : 1.3;

                wCtx.beginPath();
                wCtx.moveTo(p.px, p.py);
                wCtx.lineTo(p.x, p.y);
                wCtx.stroke();

                if (p.x < -20 || p.y < -20 || p.x > w + 20 || p.y > h + 20 || p.life <= 0) {
                    p.x = Math.random() * w;
                    p.y = Math.random() * h;
                    p.px = p.x;
                    p.py = p.y;
                    p.life = 120 + Math.random() * 220;
                }
            }

            wRaf = requestAnimationFrame(drawWater);
        };

        resizeWater();
        addEventListener("resize", resizeWater);
        addEventListener("pointermove", onMove, { passive: true });
        addEventListener("pointerleave", onLeave);
        wRaf = requestAnimationFrame(drawWater);

        return () => {
            cancelAnimationFrame(wRaf);
            removeEventListener("resize", resizeWater);
            removeEventListener("pointermove", onMove);
            removeEventListener("pointerleave", onLeave);
        };
    }, [isLoading]);

    useEffect(() => {
        // ---------- MATRIX init ----------
        const mCanvas = matrixRef.current!;
        const mCtx = mCanvas.getContext("2d", { alpha: true })!;
        let mRaf = 0;

        const chars =
            "アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+";
        const pick = () => chars[Math.floor(Math.random() * chars.length)];

        // 🔑 Eye-friendly tuning knobs
        const FONT_SIZE = 18;          // slightly bigger chars = fewer columns
        const COL_STEP = 26;           // spacing between columns (bigger = fewer streams)
        const FADE_ALPHA = 0.16;       // higher = stronger fade = less clutter
        const ACTIVE_CHANCE = 0.35;    // only some columns draw each frame (less busy)
        const TAIL_LEN = 2;            // was 6 (big reduction!)
        const SPEED_MIN = 2.2;         // was 8
        const SPEED_MAX = 5.2;         // was 26

        const resizeMatrix = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            mCanvas.width = innerWidth * dpr;
            mCanvas.height = innerHeight * dpr;
            mCanvas.style.width = "100%";
            mCanvas.style.height = "100%";
            mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            fontSizeRef.current = FONT_SIZE;

            // ✅ fewer columns (use COL_STEP instead of fontSize)
            const cols = Math.max(1, Math.floor(innerWidth / COL_STEP));
            columnsRef.current = cols;

            dropsRef.current = Array.from({ length: cols }, () => ({
                y: Math.random() * innerHeight,
                speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
                head: Math.random() * 9999,
            }));
        };

        const drawMatrix = () => {
            const w = innerWidth;
            const h = innerHeight;

            // ✅ stronger fade (less eye fatigue)
            mCtx.fillStyle = "rgba(0,0,0,0.16)";
            mCtx.fillRect(0, 0, w, h);

            const fontSize = fontSizeRef.current;
            const colStep = fontSize * 1.6; // must match resizeMatrix
            mCtx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

            for (let i = 0; i < dropsRef.current.length; i++) {
                const d = dropsRef.current[i];
                const x = i * colStep;
                const y = d.y;

                // ✅ fewer draws overall, but when it draws it is still long
                if (Math.random() < 0.35) {
                    d.y += d.speed * 0.6;
                    if (d.y > h + 40) {
                        d.y = -Math.random() * 200;
                        d.speed = 6 + Math.random() * 10;
                    }
                    continue;
                }

                // head (softer)
                mCtx.fillStyle = "rgba(170,255,205,0.55)";
                mCtx.fillText(pick(), x, y);

                // tail (same length, softer)
                mCtx.fillStyle = "rgba(0,255,120,0.18)";
                for (let k = 1; k <= 6; k++) {
                    mCtx.fillText(pick(), x, y - k * fontSize);
                }

                d.y += d.speed * 0.6;
                if (d.y > h + 40) {
                    d.y = -Math.random() * 200;
                    d.speed = 6 + Math.random() * 10;
                }
            }

            mRaf = requestAnimationFrame(drawMatrix);
        };

        resizeMatrix();
        addEventListener("resize", resizeMatrix);
        mRaf = requestAnimationFrame(drawMatrix);

        return () => {
            cancelAnimationFrame(mRaf);
            removeEventListener("resize", resizeMatrix);
        };
    }, []);

    return (
        <>
            <canvas
                ref={waterRef}
                className={`bg-layer ${mode === "water" ? "bg-on" : "bg-off"}`}
                aria-hidden="true"
            />
            <canvas
                ref={matrixRef}
                className={`bg-layer ${mode === "matrix" ? "bg-on" : "bg-off"}`}
                aria-hidden="true"
            />
        </>
    );
}
