import React, { useEffect, useRef } from 'react';

interface AIConstellationBackgroundProps {
  className?: string;
  height?: number | string;
  interactive?: boolean;
  opacity?: number;
}

export const AIConstellationBackground: React.FC<AIConstellationBackgroundProps> = ({
  className = '',
  height = '100%',
  interactive = true,
  opacity = 1,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    let width = 0;
    let h = 0;
    let dpr = window.devicePixelRatio || 1;

    // Mouse position for subtle interaction
    const mouse = { x: -1000, y: -1000, radius: 120 };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const resize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      width = rect.width || 800;
      h = rect.height || 260;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      initNodes();
    };

    interface ConstellationNode {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      glowColor?: string;
      glowRadius?: number;
      isOrange: boolean;
      isBeacon?: boolean;
      beaconRayCount?: number;
      pulsePhase: number;
      pulseSpeed: number;
    }

    let nodes: ConstellationNode[] = [];

    const initNodes = () => {
      nodes = [];
      const nodeCount = Math.max(38, Math.min(68, Math.floor(width / 22)));

      // 1. Primary Beacon (Top Right - prominent glowing orange starburst from reference image)
      const beaconX = width * 0.82;
      const beaconY = h * 0.18;
      nodes.push({
        x: beaconX,
        y: beaconY,
        baseX: beaconX,
        baseY: beaconY,
        vx: 0.05,
        vy: 0.04,
        radius: 6.5,
        color: '#FF7A30',
        glowColor: '#FF5A1F',
        glowRadius: 28,
        isOrange: true,
        isBeacon: true,
        beaconRayCount: 10,
        pulsePhase: 0,
        pulseSpeed: 0.03,
      });

      // 2. Secondary Beacon (Mid-Right cluster anchor)
      const secBeaconX = width * 0.64;
      const secBeaconY = h * 0.68;
      nodes.push({
        x: secBeaconX,
        y: secBeaconY,
        baseX: secBeaconX,
        baseY: secBeaconY,
        vx: -0.06,
        vy: 0.05,
        radius: 5,
        color: '#FF6A2A',
        glowColor: '#FF5A1F',
        glowRadius: 20,
        isOrange: true,
        isBeacon: true,
        beaconRayCount: 6,
        pulsePhase: 1.5,
        pulseSpeed: 0.025,
      });

      // 3. Third Center-Right Beacon
      const thirdBeaconX = width * 0.52;
      const thirdBeaconY = h * 0.42;
      nodes.push({
        x: thirdBeaconX,
        y: thirdBeaconY,
        baseX: thirdBeaconX,
        baseY: thirdBeaconY,
        vx: 0.04,
        vy: -0.05,
        radius: 4.5,
        color: '#FF8A4C',
        glowColor: '#FF5A1F',
        glowRadius: 18,
        isOrange: true,
        isBeacon: false,
        pulsePhase: 3.0,
        pulseSpeed: 0.02,
      });

      // Generate remaining constellation nodes
      for (let i = 0; i < nodeCount; i++) {
        // Bias positions to match reference image:
        // Left side (10% to 48% width) is silvery-white mesh.
        // Right side (48% to 92% width) is orange/amber mesh with flares.
        const isLeftSide = Math.random() < 0.48;
        let x: number;
        let y: number;
        const isOrange = !isLeftSide;

        if (isLeftSide) {
          // Clustered towards left-middle
          x = width * (0.05 + Math.random() * 0.42);
          y = h * (0.2 + Math.random() * 0.65);
        } else {
          // Clustered towards right-middle
          x = width * (0.45 + Math.random() * 0.48);
          y = h * (0.15 + Math.random() * 0.72);
        }

        const radius = isOrange
          ? Math.random() * 2.8 + 1.8
          : Math.random() * 2.5 + 1.5;

        const color = isOrange
          ? Math.random() < 0.35
            ? '#FFA060'
            : '#FF5A1F'
          : Math.random() < 0.4
          ? '#FFFFFF'
          : '#D8E2EC';

        nodes.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          radius,
          color,
          glowColor: isOrange ? '#FF5A1F' : undefined,
          glowRadius: isOrange ? radius * 2.5 : undefined,
          isOrange,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.015 + Math.random() * 0.02,
        });
      }
    };

    window.addEventListener('resize', resize);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    resize();

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, h);

      // 1. Atmospheric Ambient Radial Glow behind the Orange cluster
      const ambientGlow = ctx.createRadialGradient(
        width * 0.75,
        h * 0.4,
        10,
        width * 0.75,
        h * 0.4,
        width * 0.4
      );
      ambientGlow.addColorStop(0, 'rgba(255, 90, 31, 0.16)');
      ambientGlow.addColorStop(0.5, 'rgba(255, 90, 31, 0.05)');
      ambientGlow.addColorStop(1, 'rgba(255, 90, 31, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, h);

      // 2. Center-Top Concentric Orbital Arcs (from the reference image)
      const arcCenterX = width * 0.48;
      const arcCenterY = h * 0.55;
      const arcPulse = Math.sin(frame * 0.02) * 0.15;

      ctx.save();
      // Inner Arc
      ctx.beginPath();
      ctx.arc(
        arcCenterX,
        arcCenterY,
        Math.min(width, h) * 0.38,
        -Math.PI * 0.85,
        -Math.PI * 0.25
      );
      ctx.strokeStyle = `rgba(255, 90, 31, ${0.45 + arcPulse})`;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#FF5A1F';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Outer Arc
      ctx.beginPath();
      ctx.arc(
        arcCenterX,
        arcCenterY,
        Math.min(width, h) * 0.52,
        -Math.PI * 0.8,
        -Math.PI * 0.32
      );
      ctx.strokeStyle = `rgba(255, 110, 42, ${0.35 + arcPulse})`;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = '#FF5A1F';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();

      // 3. Update Node Positions & Drift
      const maxDistance = Math.min(width * 0.22, 130);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          // Gentle bounds bounce
          if (node.x < 15 || node.x > width - 15) node.vx *= -1;
          if (node.y < 15 || node.y > h - 15) node.vy *= -1;

          // Subtle mouse deflection
          const dxMouse = mouse.x - node.x;
          const dyMouse = mouse.y - node.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distMouse < mouse.radius && distMouse > 0) {
            const force = (1 - distMouse / mouse.radius) * 0.8;
            node.x -= (dxMouse / distMouse) * force * 3;
            node.y -= (dyMouse / distMouse) * force * 3;
          }
        }
      }

      // 4. Draw Connecting Network Lines & Translucent Facets
      ctx.save();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const factor = 1 - dist / maxDistance;
            const isOrangeLink = a.isOrange || b.isOrange;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            if (isOrangeLink) {
              const alpha = factor * 0.55;
              ctx.strokeStyle = `rgba(255, 90, 31, ${alpha})`;
              ctx.lineWidth = factor * 1.5;
            } else {
              const alpha = factor * 0.35;
              ctx.strokeStyle = `rgba(220, 230, 245, ${alpha})`;
              ctx.lineWidth = factor * 1.0;
            }
            ctx.stroke();

            // Render occasional subtle translucent web polygon facet
            if (j % 5 === 0 && dist < maxDistance * 0.75) {
              const thirdIdx = (j + 2) % nodes.length;
              const c = nodes[thirdIdx];
              const dAC = Math.hypot(a.x - c.x, a.y - c.y);
              const dBC = Math.hypot(b.x - c.x, b.y - c.y);

              if (dAC < maxDistance && dBC < maxDistance) {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.lineTo(c.x, c.y);
                ctx.closePath();
                ctx.fillStyle = isOrangeLink
                  ? `rgba(255, 90, 31, ${0.035 * factor})`
                  : `rgba(255, 255, 255, ${0.02 * factor})`;
                ctx.fill();
              }
            }
          }
        }
      }
      ctx.restore();

      // 5. Draw Beacon Radiating Light Ray Spikes (Top Right Starburst)
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.isBeacon && node.beaconRayCount) {
          ctx.save();
          ctx.translate(node.x, node.y);
          const rayPulse = 1 + Math.sin(frame * node.pulseSpeed + node.pulsePhase) * 0.2;

          for (let r = 0; r < node.beaconRayCount; r++) {
            const angle = (Math.PI * 2 * r) / node.beaconRayCount + (frame * 0.003);
            const rayLen = (35 + (r % 3) * 22) * rayPulse;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
            ctx.strokeStyle = `rgba(255, 110, 42, ${0.35 - (r % 2) * 0.15})`;
            ctx.lineWidth = r % 2 === 0 ? 1.5 : 0.8;
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // 6. Draw Nodes & Ambient Halos
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pulse = 1 + Math.sin(frame * node.pulseSpeed + node.pulsePhase) * 0.18;
        const currentRadius = node.radius * pulse;

        // Ambient Bloom around glowing beacons
        if (node.glowRadius && node.glowColor) {
          ctx.save();
          const radial = ctx.createRadialGradient(
            node.x,
            node.y,
            currentRadius * 0.5,
            node.x,
            node.y,
            node.glowRadius * pulse
          );
          radial.addColorStop(0, 'rgba(255, 90, 31, 0.7)');
          radial.addColorStop(0.4, 'rgba(255, 90, 31, 0.25)');
          radial.addColorStop(1, 'rgba(255, 90, 31, 0)');
          ctx.fillStyle = radial;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.glowRadius * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Core Solid Node Dot
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        if (node.isOrange) {
          ctx.shadowColor = '#FF5A1F';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 4;
        }
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{ height, opacity }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
