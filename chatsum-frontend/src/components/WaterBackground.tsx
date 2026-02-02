import { useEffect, useRef } from "react";

type Props = { isLoading?: boolean };

// -------- noise utils --------
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

// -------- particles --------
type Particle = {
    x: number;
    y: number;
    px: number;
    py: number;
    life: number;
};

export default function WaterBackground({ isLoading = false }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);

    // 🔑 smoothed pointer
    const pointerRef = useRef({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        has: false,
    });

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d", { alpha: true })!;
        let raf = 0;

        const resize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = innerWidth * dpr;
            canvas.height = innerHeight * dpr;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = Math.min(1600, Math.floor((innerWidth * innerHeight) / 1400));
            particlesRef.current = Array.from({ length: count }, () => {
                const x = Math.random() * innerWidth;
                const y = Math.random() * innerHeight;
                return { x, y, px: x, py: y, life: 120 + Math.random() * 200 };
            });
        };

        // 🔑 smooth pointer movement
        let targetX = 0;
        let targetY = 0;
        let lastX = 0;
        let lastY = 0;

        const onMove = (e: PointerEvent) => {
            targetX = e.clientX;
            targetY = e.clientY;
            pointerRef.current.has = true;
        };

        const onLeave = () => {
            pointerRef.current.has = false;
        };

        const draw = () => {
            const w = innerWidth;
            const h = innerHeight;
            const t = performance.now() * 0.001;
            const ocean = document.documentElement.dataset.theme === "ocean";

            // smooth pointer velocity
            lastX += (targetX - lastX) * 0.08;
            lastY += (targetY - lastY) * 0.08;

            pointerRef.current.vx = (lastX - pointerRef.current.x) * 0.04;
            pointerRef.current.vy = (lastY - pointerRef.current.y) * 0.04;
            pointerRef.current.x = lastX;
            pointerRef.current.y = lastY;

            // background
            const g = ctx.createLinearGradient(0, 0, w, h);
            if (ocean) {
                g.addColorStop(0, "rgba(10,110,190,0.32)");
                g.addColorStop(0.5, "rgba(120,230,255,0.18)");
                g.addColorStop(1, "rgba(0,70,140,0.30)");
            } else {
                g.addColorStop(0, "rgba(12,14,24,0.96)");
                g.addColorStop(1, "rgba(0,0,0,0.98)");
            }
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

            // trails
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = ocean
                ? "rgba(255,255,255,0.09)"
                : "rgba(0,0,0,0.14)";
            ctx.fillRect(0, 0, w, h);

            const speed = isLoading ? 1.8 : 1.15;
            const scaleA = 0.0015;
            const scaleB = 0.0045;

            const pointer = pointerRef.current;

            // 🔑 MUCH more subtle interaction
            const influenceR = 110;
            const strength = 42;

            ctx.globalCompositeOperation = ocean ? "multiply" : "lighter";
            ctx.lineCap = "round";

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

                // 🔑 visibility fix for ocean
                ctx.strokeStyle = ocean
                    ? "rgba(25, 85, 150, 0.22)"     // visible blue ink on light
                    : "rgba(180, 210, 255, 0.16)"; // same as before on dark
                ctx.lineWidth = ocean ? 1.7 : 1.3;

                ctx.beginPath();
                ctx.moveTo(p.px, p.py);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();

                if (p.x < -20 || p.y < -20 || p.x > w + 20 || p.y > h + 20 || p.life <= 0) {
                    p.x = Math.random() * w;
                    p.y = Math.random() * h;
                    p.px = p.x;
                    p.py = p.y;
                    p.life = 120 + Math.random() * 220;
                }
            }

            raf = requestAnimationFrame(draw);
        };

        resize();
        addEventListener("resize", resize);
        addEventListener("pointermove", onMove, { passive: true });
        addEventListener("pointerleave", onLeave);
        raf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(raf);
            removeEventListener("resize", resize);
            removeEventListener("pointermove", onMove);
            removeEventListener("pointerleave", onLeave);
        };
    }, [isLoading]);

    return <canvas ref={canvasRef} className="water-bg" aria-hidden="true" />;
}
