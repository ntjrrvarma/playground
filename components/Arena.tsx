"use client";

import { useEffect, useRef } from "react";
import type { ArenaState } from "@/lib/arenaState";
import type { Fighter } from "@/lib/types";

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

type FloatingText = {
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
};

type Projectile = {
  x: number;
  y: number;
  targetX: number;
  speed: number;
  color: string;
  coreColor: string;
  radius: number;
  fromLeft: boolean;
  active: boolean;
};

export function Arena({ fighters, state }: { fighters: Fighter[]; state: ArenaState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const projectileRef = useRef<Projectile | null>(null);
  const lastSeqRef = useRef(0);
  const shakeRef = useRef(0);

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

    function spawnHitSparks(x: number, y: number, color: string, count = 28) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 5.5;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.5,
          size: Math.random() > 0.4 ? 3 : 5,
          color: i % 3 === 0 ? "#FFFFFF" : color,
          life: 0,
          maxLife: 16 + Math.floor(Math.random() * 14),
        });
      }
    }

    function addFloatText(text: string, x: number, y: number, color = "#FFDF00", size = 18) {
      floatingTextsRef.current.push({
        text,
        x,
        y,
        color,
        size,
        life: 0,
        maxLife: 42,
      });
    }

    // Draw Aircraft Carrier Background (Street Fighter 6 Guile Stage style)
    function drawCarrierStage(w: number, h: number, tick: number) {
      if (!ctx) return;
      // 1. Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
      skyGrad.addColorStop(0, "#2575fc");
      skyGrad.addColorStop(0.5, "#6aafff");
      skyGrad.addColorStop(1, "#c8e4ff");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.62);

      // Fluffy clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 220 + tick * 0.3) % (w + 260)) - 130;
        const cy = 40 + (i % 3) * 22;
        ctx.beginPath();
        ctx.arc(cx, cy, 38, 0, Math.PI * 2);
        ctx.arc(cx + 28, cy - 10, 32, 0, Math.PI * 2);
        ctx.arc(cx + 56, cy, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Warship / Carrier Superstructure in background
      const shipBaseY = h * 0.58;
      ctx.fillStyle = "#5c6b7d";
      ctx.fillRect(w * 0.28, shipBaseY - 120, w * 0.44, 120);

      // Radar mast & antennae
      ctx.strokeStyle = "#475363";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, shipBaseY - 120);
      ctx.lineTo(w * 0.5, shipBaseY - 190);
      ctx.moveTo(w * 0.44, shipBaseY - 160);
      ctx.lineTo(w * 0.56, shipBaseY - 160);
      ctx.moveTo(w * 0.46, shipBaseY - 178);
      ctx.lineTo(w * 0.54, shipBaseY - 178);
      ctx.stroke();

      // Bunting / Signal flags strung from mast
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.05, shipBaseY - 70);
      ctx.quadraticCurveTo(w * 0.28, shipBaseY - 140, w * 0.5, shipBaseY - 180);
      ctx.quadraticCurveTo(w * 0.72, shipBaseY - 140, w * 0.95, shipBaseY - 70);
      ctx.stroke();

      const flagColors = ["#E63946", "#F1FAEE", "#A8DADC", "#457B9D", "#E9C46A"];
      for (let f = 0; f < 18; f++) {
        const t = (f + 1) / 20;
        const fx = w * 0.05 + t * (w * 0.9);
        const fy = shipBaseY - 70 - Math.sin(t * Math.PI) * 105;
        ctx.fillStyle = flagColors[f % flagColors.length];
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + 6, fy + 8);
        ctx.lineTo(fx - 6, fy + 8);
        ctx.fill();
      }

      // Fighter jet parked on left deck
      ctx.fillStyle = "#708090";
      ctx.beginPath();
      ctx.moveTo(w * 0.02, shipBaseY - 15);
      ctx.lineTo(w * 0.18, shipBaseY - 45);
      ctx.lineTo(w * 0.26, shipBaseY - 15);
      ctx.closePath();
      ctx.fill();
      // Cockpit glass
      ctx.fillStyle = "#1E3A8A";
      ctx.fillRect(w * 0.14, shipBaseY - 35, 24, 12);

      // Cheering sailors / crew along the flight deck barrier
      for (let i = 0; i < 9; i++) {
        const sx = w * 0.22 + i * 44;
        const bounce = Math.sin(tick * 0.15 + i) * 3;
        const uniformColor = i % 2 === 0 ? "#F8FAFC" : "#EAB308"; // white dress or yellow deck crew
        // body
        ctx.fillStyle = uniformColor;
        ctx.fillRect(sx, shipBaseY - 42 + bounce, 12, 28);
        // head & cap
        ctx.fillStyle = "#fbcfe8";
        ctx.beginPath();
        ctx.arc(sx + 6, shipBaseY - 48 + bounce, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx + 1, shipBaseY - 54 + bounce, 10, 4);
        // waving arms / glowstick
        if (i % 3 === 0) {
          ctx.strokeStyle = "#F97316";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sx + 6, shipBaseY - 44 + bounce);
          ctx.lineTo(sx + 16, shipBaseY - 58 + bounce);
          ctx.stroke();
        }
      }

      // 3. Flight Deck (Tarmac)
      const tarmacGrad = ctx.createLinearGradient(0, shipBaseY, 0, h);
      tarmacGrad.addColorStop(0, "#2c333a");
      tarmacGrad.addColorStop(0.3, "#21272e");
      tarmacGrad.addColorStop(1, "#171a1d");
      ctx.fillStyle = tarmacGrad;
      ctx.fillRect(0, shipBaseY, w, h - shipBaseY);

      // Deck runway perspective line
      ctx.strokeStyle = "#38434d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, shipBaseY);
      ctx.lineTo(w, shipBaseY);
      ctx.stroke();

      // Yellow flight deck landing stripes (Street Fighter 6 signature tarmac marking)
      ctx.fillStyle = "#FACC15";
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h);
      ctx.lineTo(w * 0.9, h);
      ctx.lineTo(w * 0.78, shipBaseY);
      ctx.lineTo(w * 0.22, shipBaseY);
      ctx.closePath();
      ctx.fillStyle = "rgba(250, 204, 21, 0.18)";
      ctx.fill();

      // Center yellow deck lines
      ctx.strokeStyle = "#FACC15";
      ctx.lineWidth = 6;
      ctx.setLineDash([28, 22]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, shipBaseY);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Street Fighter 6 Styled HUD (Health Bars, Drive Gauges, Center Timer)
    function drawSf6Hud(
      w: number,
      fightersList: Fighter[],
      curHp: Record<string, number>,
      curRound: number,
      verdictWinner?: string,
    ) {
      if (!ctx) return;
      const f1 = fightersList[0];
      const f2 = fightersList[1];
      if (!f1 || !f2) return;

      const hp1 = Math.max(0, curHp[f1.id] ?? 100);
      const hp2 = Math.max(0, curHp[f2.id] ?? 100);

      const topY = 16;
      const barW = w * 0.38;
      const barH = 18;
      const centerX = w / 2;

      // 1. Center Timer Badge (Round / Timer Box)
      ctx.fillStyle = "#111827";
      ctx.strokeStyle = "#FACC15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(centerX - 28, topY - 4, 56, 42, 6);
      ctx.fill();
      ctx.stroke();

      // Timer display (Street Fighter 6 purple/neon timer)
      ctx.fillStyle = "#EC4899";
      ctx.font = "900 24px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        curRound > 0 ? (99 - curRound * 15).toString() : "99",
        centerX,
        topY + 24,
      );
      ctx.fillStyle = "#FACC15";
      ctx.font = "700 9px ui-monospace, monospace";
      ctx.fillText(
        verdictWinner ? "KO" : curRound > 0 ? `R${curRound}` : "FIGHT",
        centerX,
        topY + 34,
      );

      // 2. Player 1 (Left) Health Bar & Name Plate
      // Name & portrait tag
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 12px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(`P1 · ${f1.name.toUpperCase()}`, centerX - barW - 32, topY - 2);

      // Angled background track
      ctx.fillStyle = "#1F2937";
      ctx.beginPath();
      ctx.moveTo(centerX - 36, topY);
      ctx.lineTo(centerX - 36 - barW, topY);
      ctx.lineTo(centerX - 46 - barW, topY + barH);
      ctx.lineTo(centerX - 36, topY + barH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // P1 Health fill (draining inward to center)
      const fillW1 = (barW * hp1) / 100;
      if (fillW1 > 0) {
        const hpGrad1 = ctx.createLinearGradient(centerX - 36 - fillW1, 0, centerX - 36, 0);
        hpGrad1.addColorStop(0, hp1 > 35 ? "#EAB308" : "#EF4444");
        hpGrad1.addColorStop(1, hp1 > 35 ? "#F97316" : "#DC2626");
        ctx.fillStyle = hpGrad1;
        ctx.beginPath();
        ctx.moveTo(centerX - 36, topY + 1);
        ctx.lineTo(centerX - 36 - fillW1, topY + 1);
        ctx.lineTo(centerX - 44 - fillW1, topY + barH - 1);
        ctx.lineTo(centerX - 36, topY + barH - 1);
        ctx.closePath();
        ctx.fill();
      }

      // P1 Drive Gauge (6 segmented pips like SF6)
      const p1GaugeY = topY + barH + 4;
      const pipW = (barW - 15) / 6;
      for (let p = 0; p < 6; p++) {
        const px = centerX - 36 - (p + 1) * pipW - p * 3;
        const hasPip = hp1 > p * 16;
        ctx.fillStyle = hasPip ? "#10B981" : "#374151";
        ctx.fillRect(px, p1GaugeY, pipW, 5);
      }

      // 3. Player 2 (Right) Health Bar & Name Plate
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "right";
      ctx.fillText(`${f2.name.toUpperCase()} · P2`, centerX + barW + 32, topY - 2);

      // Angled background track
      ctx.fillStyle = "#1F2937";
      ctx.beginPath();
      ctx.moveTo(centerX + 36, topY);
      ctx.lineTo(centerX + 36 + barW, topY);
      ctx.lineTo(centerX + 46 + barW, topY + barH);
      ctx.lineTo(centerX + 36, topY + barH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // P2 Health fill (draining inward to center)
      const fillW2 = (barW * hp2) / 100;
      if (fillW2 > 0) {
        const hpGrad2 = ctx.createLinearGradient(centerX + 36, 0, centerX + 36 + fillW2, 0);
        hpGrad2.addColorStop(0, hp2 > 35 ? "#F97316" : "#DC2626");
        hpGrad2.addColorStop(1, hp2 > 35 ? "#EAB308" : "#EF4444");
        ctx.fillStyle = hpGrad2;
        ctx.beginPath();
        ctx.moveTo(centerX + 36, topY + 1);
        ctx.lineTo(centerX + 36 + fillW2, topY + 1);
        ctx.lineTo(centerX + 44 + fillW2, topY + barH - 1);
        ctx.lineTo(centerX + 36, topY + barH - 1);
        ctx.closePath();
        ctx.fill();
      }

      // P2 Drive Gauge (6 segmented pips)
      const p2GaugeY = topY + barH + 4;
      for (let p = 0; p < 6; p++) {
        const px = centerX + 36 + p * (pipW + 3);
        const hasPip = hp2 > p * 16;
        ctx.fillStyle = hasPip ? "#10B981" : "#374151";
        ctx.fillRect(px, p2GaugeY, pipW, 5);
      }

      // 4. Bottom Super Art Gauges (Street Fighter 6 signature meters)
      const botY = canvas!.height - 18;
      // P1 Super meter
      ctx.fillStyle = "#111827";
      ctx.fillRect(20, botY - 14, 140, 16);
      ctx.strokeStyle = "#F43F5E";
      ctx.strokeRect(20, botY - 14, 140, 16);
      ctx.fillStyle = "#F43F5E";
      ctx.font = "800 12px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText("CRITICAL ART", 26, botY - 2);

      // P2 Super meter
      ctx.fillStyle = "#111827";
      ctx.fillRect(w - 160, botY - 14, 140, 16);
      ctx.strokeStyle = "#38BDF8";
      ctx.strokeRect(w - 160, botY - 14, 140, 16);
      ctx.fillStyle = "#38BDF8";
      ctx.font = "800 12px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText("SUPER ART LV3", w - 26, botY - 2);

      ctx.shadowBlur = 0;
    }

    // Street Fighter Guile-Type Brawler (Left Fighter)
    function drawGuileBrawler(
      x: number,
      y: number,
      anim: "idle" | "attack" | "hit" | "ko",
      tick: number,
    ) {
      if (!ctx) return;
      const bob = anim === "idle" ? Math.sin(tick * 0.18) * 4 : 0;
      const lungeX = anim === "attack" ? 36 : 0;
      const recoilX = anim === "hit" ? -28 : 0;
      const fx = x + lungeX + recoilX;
      const fy = y + bob;

      // Drop shadow on flight deck
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(fx, y + 26, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      if (anim === "ko") {
        // Knocked down on flight deck
        ctx.fillStyle = "#3B82F6";
        ctx.fillRect(fx - 40, y + 10, 70, 16);
        ctx.fillStyle = "#F59E0B"; // blonde hair
        ctx.fillRect(fx - 48, y + 6, 16, 16);
        return;
      }

      const flash = anim === "hit" && tick % 4 < 2;

      // Legs / combat pants (Guile signature green/blue camo fatigue)
      ctx.fillStyle = flash ? "#FFFFFF" : "#1E3A8A";
      // Left leg
      ctx.fillRect(fx - 18, fy + 4, 14, 24);
      // Right leg crouching/bracing
      ctx.fillRect(fx + 2, fy + 2, 16, 26);
      // Combat boots
      ctx.fillStyle = "#1F2937";
      ctx.fillRect(fx - 24, fy + 24, 18, 8);
      ctx.fillRect(fx + 2, fy + 26, 20, 8);

      // Torso / white sleeveless muscle tank
      ctx.fillStyle = flash ? "#FFFFFF" : "#F8FAFC";
      ctx.fillRect(fx - 16, fy - 26, 30, 32);

      // Muscular arms with green camo wristbands
      ctx.fillStyle = flash ? "#FFFFFF" : "#FBBF24"; // skin tone
      // Back arm
      ctx.fillRect(fx - 28, fy - 22, 14, 22);
      // Lead punch arm
      if (anim === "attack") {
        // Extended Heavy Punch / Sonic Boom thrust
        ctx.fillRect(fx + 10, fy - 24, 48, 14);
        ctx.fillStyle = "#EF4444"; // red boxing glove
        ctx.beginPath();
        ctx.arc(fx + 62, fy - 17, 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Guarded boxing stance
        ctx.fillRect(fx + 10, fy - 26, 14, 20);
        ctx.fillStyle = "#EF4444";
        ctx.beginPath();
        ctx.arc(fx + 18, fy - 28, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Head
      ctx.fillStyle = flash ? "#FFFFFF" : "#FBBF24";
      ctx.beginPath();
      ctx.arc(fx, fy - 36, 12, 0, Math.PI * 2);
      ctx.fill();

      // Guile iconic tall flat-top blonde hair
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.moveTo(fx - 14, fy - 42);
      ctx.lineTo(fx - 18, fy - 62);
      ctx.lineTo(fx + 18, fy - 62);
      ctx.lineTo(fx + 14, fy - 42);
      ctx.closePath();
      ctx.fill();
    }

    // Street Fighter Chun-Li-Type Martial Artist (Right Fighter)
    function drawChunLiFighter(
      x: number,
      y: number,
      anim: "idle" | "attack" | "hit" | "ko",
      tick: number,
    ) {
      if (!ctx) return;
      const bob = anim === "idle" ? -Math.sin(tick * 0.18) * 4 : 0;
      const lungeX = anim === "attack" ? -36 : 0;
      const recoilX = anim === "hit" ? 28 : 0;
      const fx = x + lungeX + recoilX;
      const fy = y + bob;

      // Drop shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(fx, y + 26, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      if (anim === "ko") {
        ctx.fillStyle = "#2563EB";
        ctx.fillRect(fx - 30, y + 10, 70, 16);
        ctx.fillStyle = "#111827";
        ctx.fillRect(fx + 30, y + 6, 16, 16);
        return;
      }

      const flash = anim === "hit" && tick % 4 < 2;

      // Chun-Li signature athletic legs & white combat boots
      ctx.fillStyle = flash ? "#FFFFFF" : "#1E293B"; // dark leggings
      ctx.fillRect(fx - 14, fy + 2, 13, 26);
      ctx.fillRect(fx + 2, fy + 4, 14, 24);
      // White boots with gold laces
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(fx - 18, fy + 24, 18, 9);
      ctx.fillRect(fx + 2, fy + 24, 18, 9);

      // Royal Blue Qipao tunic with gold embroidery trim
      ctx.fillStyle = flash ? "#FFFFFF" : "#2563EB";
      ctx.fillRect(fx - 14, fy - 26, 28, 30);
      ctx.fillStyle = "#F59E0B"; // gold sash & embroidery
      ctx.fillRect(fx - 14, fy - 12, 28, 4);

      // Arms & Spiked Bracelets
      ctx.fillStyle = flash ? "#FFFFFF" : "#FBBF24";
      if (anim === "attack") {
        // Kikoken / Lightning Palm thrust
        ctx.fillRect(fx - 46, fy - 24, 42, 12);
        // Spiked bracelet
        ctx.fillStyle = "#475363";
        ctx.fillRect(fx - 42, fy - 28, 10, 20);
        ctx.fillStyle = "#FBBF24";
        ctx.beginPath();
        ctx.arc(fx - 52, fy - 18, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Kung Fu crane guard
        ctx.fillRect(fx - 20, fy - 26, 12, 20);
        ctx.fillStyle = "#475363";
        ctx.fillRect(fx - 22, fy - 18, 8, 12);
      }

      // Head
      ctx.fillStyle = flash ? "#FFFFFF" : "#FBBF24";
      ctx.beginPath();
      ctx.arc(fx, fy - 34, 11, 0, Math.PI * 2);
      ctx.fill();

      // Iconic Chun-Li hair buns with white silk ribbons (ox horns)
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(fx - 12, fy - 42, 7, 0, Math.PI * 2);
      ctx.arc(fx + 12, fy - 42, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(fx - 12, fy - 42, 4, 0, Math.PI * 2);
      ctx.arc(fx + 12, fy - 42, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Giant Glowing Argument Sphere (from user's Street Fighter 6 screenshot!)
    function drawArgumentSphere(p: Projectile, tick: number) {
      if (!ctx) return;
      const r = p.radius;
      // Pulsing outer heat aura
      const aura = r + 8 + Math.sin(tick * 0.4) * 4;
      const grad = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, aura);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.25, "#FBBF24");
      grad.addColorStop(0.65, "#EA580C");
      grad.addColorStop(1, "rgba(220, 38, 38, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, aura, 0, Math.PI * 2);
      ctx.fill();

      // Honeycomb / Basketball energy grid pattern (exact SF6 screenshot detail)
      ctx.strokeStyle = "#431407";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner curved seam lines
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.45, r, 0, 0, Math.PI * 2);
      ctx.moveTo(p.x - r, p.y);
      ctx.lineTo(p.x + r, p.y);
      ctx.stroke();

      // Traveling fire embers
      for (let i = 0; i < 4; i++) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * r,
          y: p.y + (Math.random() - 0.5) * r,
          vx: p.fromLeft ? -2.5 - Math.random() * 2 : 2.5 + Math.random() * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 3 + Math.random() * 3,
          color: Math.random() > 0.5 ? "#FACC15" : "#F97316",
          life: 0,
          maxLife: 14,
        });
      }
    }

    function render() {
      rafId = requestAnimationFrame(render);
      if (!visible || !ctx || !canvas) return;
      frame++;

      const w = canvas.width;
      const h = canvas.height;
      const cur = stateRef.current;

      // Handle screen shake on impact
      ctx.save();
      if (shakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * shakeRef.current;
        const sy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(sx, sy);
        shakeRef.current *= 0.88;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      // Check for state events triggering combat action
      if (cur.eventSeq !== lastSeqRef.current) {
        lastSeqRef.current = cur.eventSeq;
        const f1 = fighters[0];
        const f2 = fighters[1];

        // Trigger giant argument energy sphere when leader attacks
        if (cur.anim[f1?.id] === "attack") {
          projectileRef.current = {
            x: w * 0.32,
            y: h * 0.65,
            targetX: w * 0.72,
            speed: 12,
            color: "#F97316",
            coreColor: "#FEF08A",
            radius: 26,
            fromLeft: true,
            active: true,
          };
          addFloatText("ARGUMENT DRIVE!", w * 0.3, h * 0.52, "#FACC15", 18);
        } else if (cur.anim[f2?.id] === "attack") {
          projectileRef.current = {
            x: w * 0.68,
            y: h * 0.65,
            targetX: w * 0.28,
            speed: 12,
            color: "#38BDF8",
            coreColor: "#E0F2FE",
            radius: 26,
            fromLeft: false,
            active: true,
          };
          addFloatText("LOGIC REBUTTAL!", w * 0.7, h * 0.52, "#38BDF8", 18);
        }

        // Damage impact
        fighters.forEach((f, idx) => {
          const dmg = cur.lastDamage[f.id] ?? 0;
          if (dmg > 0 && cur.anim[f.id] === "hit") {
            const targetX = idx === 0 ? w * 0.3 : w * 0.7;
            spawnHitSparks(targetX, h * 0.64, "#F97316", 36);
            shakeRef.current = 12;
            addFloatText(`-${dmg} HP! PUNISH COUNTER`, targetX, h * 0.56, "#EF4444", 20);
          }
          if (cur.anim[f.id] === "ko") {
            const targetX = idx === 0 ? w * 0.26 : w * 0.74;
            spawnHitSparks(targetX, h * 0.68, "#EF4444", 48);
            shakeRef.current = 18;
          }
        });
      }

      // Draw background stage
      drawCarrierStage(w, h, frame);

      // Stage positions for 1v1 Street Fighter face-off
      const p1X = w * 0.28;
      const p2X = w * 0.72;
      const groundY = h * 0.75;

      const f1 = fighters[0];
      const f2 = fighters[1];
      const anim1 = cur.anim[f1?.id] ?? "idle";
      const anim2 = cur.anim[f2?.id] ?? "idle";

      // Draw Fighter 1 (Guile / Boxer)
      drawGuileBrawler(p1X, groundY, anim1, frame);

      // Draw Fighter 2 (Chun-Li / Martial Artist)
      drawChunLiFighter(p2X, groundY, anim2, frame);

      // If 3 or 4 fighters, draw reserve fighters standing in battle guard in the wings
      if (fighters.length > 2) {
        for (let i = 2; i < fighters.length; i++) {
          const rx = i === 2 ? w * 0.12 : w * 0.88;
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
          ctx.beginPath();
          ctx.ellipse(rx, groundY + 22, 22, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = i === 2 ? "#10B981" : "#A855F7";
          ctx.fillRect(rx - 8, groundY - 18, 16, 26);
          ctx.fillStyle = "#FBBF24";
          ctx.beginPath();
          ctx.arc(rx, groundY - 26, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "700 9px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(`F${i + 1} TAG`, rx, groundY - 38);
        }
      }

      // Update & Draw traveling Argument Projectile
      const proj = projectileRef.current;
      if (proj && proj.active) {
        drawArgumentSphere(proj, frame);
        const dir = proj.fromLeft ? 1 : -1;
        proj.x += proj.speed * dir;

        const reached = proj.fromLeft ? proj.x >= proj.targetX : proj.x <= proj.targetX;
        if (reached) {
          proj.active = false;
          spawnHitSparks(proj.targetX, proj.y, proj.color, 32);
          shakeRef.current = 9;
        }
      }

      // Update & draw sparks
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life++;
        if (p.life >= p.maxLife) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        alive.push(p);
      }
      particlesRef.current = alive;

      // Update & draw floating arcade combat text
      const aliveTexts: FloatingText[] = [];
      for (const ft of floatingTextsRef.current) {
        ft.life++;
        if (ft.life >= ft.maxLife) continue;
        ft.y -= 1.4;
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = `900 ${ft.size}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        aliveTexts.push(ft);
      }
      floatingTextsRef.current = aliveTexts;

      // Draw Street Fighter 6 authentic HUD over the canvas
      drawSf6Hud(w, fighters, cur.hp, cur.round, cur.verdict?.winner);

      // K.O. Banner across screen if fight is finished
      if (cur.verdict) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, h * 0.42, w, 68);

        ctx.fillStyle = "#FACC15";
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 4;
        ctx.font = "900 48px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.strokeText("K. O. !", w / 2, h * 0.55);
        ctx.fillText("K. O. !", w / 2, h * 0.55);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "700 13px ui-monospace, monospace";
        ctx.fillText(`DECISIVE VERDICT: ${cur.verdict.winner.toUpperCase()}`, w / 2, h * 0.61);
      }

      ctx.restore();
    }

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [fighters]);

  return (
    <div className="border border-[var(--border)] bg-[#0d1117] p-2.5 shadow-2xl">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FACC15]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#EC4899]" />
          Street Fighter Arena · Aircraft Carrier Deck
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#38BDF8] tabular-nums">
          {state.verdict
            ? `MATCH DECIDED: ${state.verdict.winner.toUpperCase()}`
            : state.round > 0
              ? `Round ${state.round} of 5`
              : "ROUND 1 · READY"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={840}
        height={400}
        className="h-auto w-full border-2 border-[#1E293B] bg-[#000000]"
      />
    </div>
  );
}
