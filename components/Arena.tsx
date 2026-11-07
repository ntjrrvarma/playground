"use client";

import { useEffect, useRef } from "react";
import type { ArenaState } from "@/lib/arenaState";
import type { Fighter } from "@/lib/types";

const FIGHTER_PALETTES = [
  { main: "#C8501A", trim: "#F4A261", visor: "#111110" }, // Burnt orange gladiator
  { main: "#1D4E89", trim: "#7DCFB6", visor: "#111110" }, // Cobalt tactician
  { main: "#2A6F4E", trim: "#E9C46A", visor: "#111110" }, // Emerald vanguard
  { main: "#7A2E4D", trim: "#F2CC8F", visor: "#111110" }, // Crimson arbiter
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
};

export function Arena({ fighters, state }: { fighters: Fighter[]; state: ArenaState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const particlesRef = useRef<Particle[]>([]);
  const lastSeqRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let visible = true;
    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    function fighterCoords(idx: number, total: number, w: number, h: number) {
      const cx = w / 2;
      const cy = h * 0.57;
      const rx = w * 0.27;
      const ry = h * 0.17;
      if (total === 2) {
        return { x: idx === 0 ? cx - rx : cx + rx, y: cy };
      }
      const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
    }

    function spawnBurst(x: number, y: number, color: string, count: number, speed: number) {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const spd = speed * (0.5 + Math.random() * 0.8);
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.2,
          size: Math.random() > 0.4 ? 4 : 6,
          color,
          life: 0,
          maxLife: 24 + Math.floor(Math.random() * 18),
        });
      }
    }

    function drawPixelGladiator(
      x: number,
      y: number,
      palette: { main: string; trim: string; visor: string },
      anim: "idle" | "attack" | "hit" | "ko",
      facingRight: boolean,
      tick: number,
    ) {
      if (!ctx) return;
      const px = 4; // 4px crisp pixel grid
      const bob = anim === "idle" ? Math.round(Math.sin(tick * 0.1) * 1) * px : 0;
      const lunge = anim === "attack" ? (facingRight ? 4 * px : -4 * px) : 0;
      const shake = anim === "hit" ? (tick % 4 < 2 ? -2 * px : 2 * px) : 0;

      const gx = Math.round((x + lunge + shake) / px) * px;
      const gy = Math.round((y + bob) / px) * px;

      // Ground shadow
      ctx.fillStyle = "rgba(17, 17, 16, 0.18)";
      ctx.fillRect(gx - 5 * px, y + 6 * px, 10 * px, 2 * px);

      if (anim === "ko") {
        // Fallen pixel sprite
        ctx.fillStyle = palette.main;
        ctx.fillRect(gx - 6 * px, y + 2 * px, 12 * px, 4 * px);
        ctx.fillStyle = palette.trim;
        ctx.fillRect(gx - 7 * px, y + 1 * px, 4 * px, 4 * px);
        return;
      }

      const flash = anim === "hit" && tick % 6 < 3;
      const bodyColor = flash ? "#FFFFFF" : palette.main;
      const trimColor = flash ? "#C8501A" : palette.trim;

      // Plume / crest
      ctx.fillStyle = trimColor;
      ctx.fillRect(gx - 2 * px, gy - 9 * px, 4 * px, 2 * px);

      // Helmet & visor
      ctx.fillStyle = bodyColor;
      ctx.fillRect(gx - 3 * px, gy - 7 * px, 6 * px, 4 * px);
      ctx.fillStyle = palette.visor;
      ctx.fillRect(
        facingRight ? gx - 1 * px : gx - 2 * px,
        gy - 6 * px,
        3 * px,
        px,
      );

      // Torso armor
      ctx.fillStyle = bodyColor;
      ctx.fillRect(gx - 4 * px, gy - 3 * px, 8 * px, 6 * px);
      ctx.fillStyle = trimColor;
      ctx.fillRect(gx - 3 * px, gy - 2 * px, 6 * px, px);

      // Legs
      ctx.fillStyle = "#111110";
      ctx.fillRect(gx - 3 * px, gy + 3 * px, 2 * px, 3 * px);
      ctx.fillRect(gx + 1 * px, gy + 3 * px, 2 * px, 3 * px);

      // Shield & weapon arm
      const dir = facingRight ? 1 : -1;
      ctx.fillStyle = trimColor;
      ctx.fillRect(gx - dir * 5 * px, gy - 2 * px, 2 * px, 4 * px);

      // Spear / blade thrust
      const reach = anim === "attack" ? 6 : 3;
      ctx.fillStyle = "#111110";
      ctx.fillRect(
        dir > 0 ? gx + 4 * px : gx - (4 + reach) * px,
        gy - px,
        reach * px,
        px,
      );
    }

    function render() {
      rafId = requestAnimationFrame(render);
      if (!visible || !ctx || !canvas) return;
      frame++;

      const w = canvas.width;
      const h = canvas.height;
      const cur = stateRef.current;

      // Trigger pixelfx-style pixel bursts on new score/KO events
      if (cur.eventSeq !== lastSeqRef.current) {
        lastSeqRef.current = cur.eventSeq;
        fighters.forEach((f, idx) => {
          const pos = fighterCoords(idx, fighters.length, w, h);
          const pal = FIGHTER_PALETTES[idx % FIGHTER_PALETTES.length];
          if (cur.anim[f.id] === "hit") {
            spawnBurst(pos.x, pos.y - 12, "#C8501A", 18, 3.4);
          } else if (cur.anim[f.id] === "attack") {
            spawnBurst(pos.x, pos.y - 16, pal.trim, 10, 2.2);
          } else if (cur.anim[f.id] === "ko") {
            spawnBurst(pos.x, pos.y - 8, "#111110", 28, 4.2);
          }
        });
      }

      // Warm limestone colosseum background
      ctx.fillStyle = "#F3EFE6";
      ctx.fillRect(0, 0, w, h);

      // Colosseum tiered spectator rings
      const cx = w / 2;
      const cy = h * 0.56;
      for (let tier = 3; tier >= 1; tier--) {
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          w * (0.36 + tier * 0.045),
          h * (0.24 + tier * 0.045),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = tier % 2 === 0 ? "#E6E0D3" : "#DDD6C7";
        ctx.fill();
        ctx.strokeStyle = "#CFC7B6";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Animated pixel spectators in the stands
      for (let i = 0; i < 44; i++) {
        const ang = (i / 44) * Math.PI * 2;
        const ring = (i % 3) + 1;
        const sx = cx + Math.cos(ang) * w * (0.375 + ring * 0.04);
        const sy = cy + Math.sin(ang) * h * (0.25 + ring * 0.04);
        const hop = (frame + i * 7) % 30 < 6 ? -2 : 0;
        ctx.fillStyle = i % 5 === 0 ? "#C8501A" : "#6E6A63";
        ctx.fillRect(Math.round(sx), Math.round(sy + hop), 3, 3);
      }

      // Inner sand arena floor
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.35, h * 0.23, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#FAF7F0";
      ctx.fill();
      ctx.strokeStyle = "#111110";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner tactical reticle lines
      ctx.strokeStyle = "#E4E0D8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.33, cy);
      ctx.lineTo(cx + w * 0.33, cy);
      ctx.moveTo(cx, cy - h * 0.21);
      ctx.lineTo(cx, cy + h * 0.21);
      ctx.stroke();

      // Director Judge podium at top north arch
      ctx.fillStyle = "#111110";
      ctx.fillRect(cx - 38, 18, 76, 22);
      ctx.fillStyle = "#F9F8F6";
      ctx.font = "600 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        cur.round > 0 ? `ROUND ${cur.round} / 5` : "READY",
        cx,
        33,
      );

      // Draw fighters + HUD bars
      fighters.forEach((f, idx) => {
        const pos = fighterCoords(idx, fighters.length, w, h);
        const pal = FIGHTER_PALETTES[idx % FIGHTER_PALETTES.length];
        const anim = cur.anim[f.id] ?? "idle";
        const hp = cur.hp[f.id] ?? 100;
        const dmg = cur.lastDamage[f.id] ?? 0;

        drawPixelGladiator(
          pos.x,
          pos.y,
          pal,
          anim,
          pos.x <= cx,
          frame,
        );

        // Nameplate & HP bar above fighter
        const barW = 92;
        const bx = Math.round(pos.x - barW / 2);
        const by = Math.round(pos.y - 62);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(bx, by, barW, 22);
        ctx.strokeStyle = "#111110";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, 22);

        ctx.fillStyle = "#111110";
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.fillText(`F${idx + 1}`, bx + 4, by + 10);

        ctx.textAlign = "right";
        ctx.fillText(`${hp} HP`, bx + barW - 4, by + 10);

        // HP bar track
        ctx.fillStyle = "#E4E0D8";
        ctx.fillRect(bx + 4, by + 14, barW - 8, 4);
        ctx.fillStyle = hp > 35 ? pal.main : "#C8501A";
        ctx.fillRect(bx + 4, by + 14, Math.max(0, ((barW - 8) * hp) / 100), 4);

        if (dmg > 0 && anim === "hit") {
          ctx.fillStyle = "#C8501A";
          ctx.font = "700 11px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(`-${dmg}`, pos.x, by - 5);
        }
      });

      // Update & draw pixel particles (snapped to 2px grid)
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life++;
        if (p.life >= p.maxLife) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14; // gravity
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, p.size, p.size);
        alive.push(p);
      }
      particlesRef.current = alive;
    }

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [fighters]);

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Colosseum Live Feed · Pixel Shader Grid (4px)
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] tabular-nums">
          {state.verdict
            ? `Winner: ${state.verdict.winner.toUpperCase()}`
            : state.round > 0
              ? `Round ${state.round} of 5`
              : "Initializing Arena"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={760}
        height={320}
        className="h-auto w-full border border-[var(--border)] bg-[#F3EFE6]"
      />
    </div>
  );
}
