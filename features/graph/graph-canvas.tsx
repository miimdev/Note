'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

export type GraphNode = {
  id: string;
  title: string;
  is_favorite: boolean;
  folder_id: string | null;
  updated_at: string;
  tag_count: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
};

export type GraphEdge = { source: string; target: string };

type Props = {
  nodes: {
    id: string;
    title: string;
    is_favorite: boolean;
    folder_id: string | null;
    updated_at: string;
    tag_count: number;
  }[];
  edges: GraphEdge[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
};

/**
 * Lightweight force-directed graph on a canvas (no external graph library).
 * Repulsion is O(n²) which is fine for the few hundred notes rendered here;
 * the layout freezes after it converges to keep CPU usage low.
 */
export function GraphCanvas({ nodes: inputNodes, edges, onSelect, selectedId }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = React.useState<GraphNode[]>([]);
  const [hovered, setHovered] = React.useState<GraphNode | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [showLabels, setShowLabels] = React.useState(true);
  const dragRef = React.useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const frameRef = React.useRef<number>(0);
  const alphaRef = React.useRef(1);
  const nodesRef = React.useRef<GraphNode[]>([]);
  // Canvas is drawn by hand, so it never inherits CSS variables: the palette has
  // to be re-read whenever the theme flips, otherwise a dark-mode graph keeps
  // the light background painted on it.
  const { resolvedTheme } = useTheme();

  // Seed positions on a circle, keeping stable ids.
  React.useEffect(() => {
    const width = canvasRef.current?.clientWidth ?? 800;
    const height = canvasRef.current?.clientHeight ?? 600;
    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }

    setNodes((previous) => {
      const previousById = new Map(previous.map((node) => [node.id, node]));
      const next = inputNodes.map((node, index) => {
        const existing = previousById.get(node.id);
        const angle = (index / Math.max(inputNodes.length, 1)) * Math.PI * 2;
        const radius = Math.min(width, height) * 0.35;
        return {
          ...node,
          x: existing?.x ?? width / 2 + Math.cos(angle) * radius,
          y: existing?.y ?? height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          degree: degree.get(node.id) ?? 0,
        };
      });
      nodesRef.current = next;
      alphaRef.current = 1;
      return next;
    });
  }, [inputNodes, edges]);

  // Simulation + drawing loop.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const css = getComputedStyle(document.documentElement);
    const primary = `hsl(${css.getPropertyValue('--primary').trim() || '244 65% 54%'})`;
    const muted = `hsl(${css.getPropertyValue('--muted-foreground').trim() || '224 10% 44%'})`;
    const border = `hsl(${css.getPropertyValue('--border').trim() || '240 10% 90%'})`;
    const background = `hsl(${css.getPropertyValue('--background').trim() || '0 0% 100%'})`;

    const edgeIndex = edges.map((edge) => ({ edge }));

    const tick = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const list = nodesRef.current;
      const byId = new Map(list.map((node) => [node.id, node]));

      if (alphaRef.current > 0.005) {
        alphaRef.current *= 0.985;

        // Repulsion
        for (let i = 0; i < list.length; i += 1) {
          for (let j = i + 1; j < list.length; j += 1) {
            const a = list[i]!;
            const b = list[j]!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distanceSq = dx * dx + dy * dy || 0.01;
            const force = (2400 / distanceSq) * alphaRef.current;
            const distance = Math.sqrt(distanceSq);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }

        // Springs
        for (const { edge } of edgeIndex) {
          const a = byId.get(edge.source);
          const b = byId.get(edge.target);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const force = (distance - 130) * 0.02 * alphaRef.current;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }

        // Centering + integrate
        for (const node of list) {
          if (dragRef.current?.id === node.id) continue;
          node.vx += (width / 2 - node.x) * 0.002 * alphaRef.current;
          node.vy += (height / 2 - node.y) * 0.002 * alphaRef.current;
          node.vx *= 0.86;
          node.vy *= 0.86;
          node.x += node.vx;
          node.y += node.vy;
          const radius = 18;
          node.x = Math.max(radius, Math.min(width - radius, node.x));
          node.y = Math.max(radius, Math.min(height - radius, node.y));
        }
      }

      // Draw
      context.clearRect(0, 0, width, height);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = border;
      context.lineWidth = 1;
      for (const { edge } of edgeIndex) {
        const a = byId.get(edge.source);
        const b = byId.get(edge.target);
        if (!a || !b) continue;
        const isHot =
          selectedId === a.id ||
          selectedId === b.id ||
          hovered?.id === a.id ||
          hovered?.id === b.id;
        context.strokeStyle = isHot ? primary : border;
        context.globalAlpha = isHot ? 0.9 : 0.6;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
      context.globalAlpha = 1;

      for (const node of list) {
        const radius = 5 + Math.min(node.degree, 8) * 0.9;
        const selected = node.id === selectedId;
        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fillStyle = node.is_favorite
          ? '#f59e0b'
          : node.id === hovered?.id || selected
            ? primary
            : muted;
        context.fill();
        if (selected) {
          context.strokeStyle = primary;
          context.lineWidth = 2;
          context.stroke();
        }

        if (showLabels && (zoom > 1.2 || node.degree >= 2 || selected || node.id === hovered?.id)) {
          context.fillStyle = muted;
          context.font = '11px Vazirmatn, system-ui, sans-serif';
          context.textAlign = 'center';
          const label =
            node.title.length > 22 ? `${node.title.slice(0, 21)}…` : node.title || 'بدون عنوان';
          context.fillText(label, node.x, node.y + radius + 13);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [edges, hovered?.id, resolvedTheme, selectedId, showLabels, zoom]);

  const hitTest = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: GraphNode | null = null;
    let bestDistance = 18;
    for (const node of nodesRef.current) {
      const distance = Math.hypot(node.x - x, node.y - y);
      if (distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  };

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-none rounded-xl border bg-card active:cursor-grabbing"
        role="img"
        aria-label="نمای گراف ارتباط یادداشت‌ها"
        onMouseMove={(event) => {
          if (dragRef.current) {
            const canvas = canvasRef.current;
            const rect = canvas?.getBoundingClientRect();
            if (!rect) return;
            const node = nodesRef.current.find((item) => item.id === dragRef.current?.id);
            if (node) {
              node.x = event.clientX - rect.left - dragRef.current.offsetX;
              node.y = event.clientY - rect.top - dragRef.current.offsetY;
            }
            return;
          }
          const hit = hitTest(event.clientX, event.clientY);
          setHovered(hit);
        }}
        onMouseLeave={() => setHovered(null)}
        onMouseDown={(event) => {
          const hit = hitTest(event.clientX, event.clientY);
          if (!hit) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          dragRef.current = {
            id: hit.id,
            offsetX: event.clientX - rect.left - hit.x,
            offsetY: event.clientY - rect.top - hit.y,
          };
        }}
        onMouseUp={() => {
          dragRef.current = null;
        }}
        onClick={(event) => {
          const hit = hitTest(event.clientX, event.clientY);
          if (hit) onSelect?.(hit.id);
        }}
      />

      <div className="absolute bottom-2 end-3 flex items-center gap-1.5 rounded-lg border bg-background/90 p-1 text-[11px] shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(value + 0.2, 2))}
          className="px-1.5"
          aria-label="بزرگ‌نمایی"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(value - 0.2, 0.6))}
          className="px-1.5"
          aria-label="کوچک‌نمایی"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setShowLabels((value) => !value)}
          className="px-1.5 text-muted-foreground hover:text-foreground"
        >
          {showLabels ? 'برچسب‌ها روشن' : 'برچسب‌ها خاموش'}
        </button>
      </div>

      {hovered && (
        <div className="pointer-events-none absolute start-3 top-3 max-w-[16rem] rounded-lg border bg-background/95 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
          <p className="truncate font-medium">{hovered.title || 'بدون عنوان'}</p>
          <p className="text-muted-foreground">
            {hovered.degree} پیوند · {hovered.tag_count} برچسب
          </p>
        </div>
      )}
    </div>
  );
}
