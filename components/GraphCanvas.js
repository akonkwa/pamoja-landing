"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function clusterColor(cluster) {
  const palette = {
    "Climate Operators": "#6ff7ff",
    "Founder Graph": "#ff62d4",
    "Investor Mesh": "#f8bf54",
    "Bridge Builders": "#87ffa2",
    "Imported Cluster": "#ff9c62",
  };
  return palette[cluster] || "#f5f0d8";
}

function buildNodeMap(network) {
  const people = network?.people || [];
  return new Map(
    people.map((person, index) => [
      person.id,
      {
        ...person,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        phase: (index + 1) * 0.9,
        score: Number.isFinite(person.score) ? person.score : Number(person.score) || 0.3,
        firstSeenYear: Number.isFinite(person.firstSeenYear)
          ? person.firstSeenYear
          : Number(person.firstSeenYear) || new Date().getFullYear(),
      },
    ])
  );
}

export default function GraphCanvas({ network }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const nodesRef = useRef(new Map());
  const frameRef = useRef(null);
  const dragRef = useRef({ dragging: false, x: 0, y: 0 });
  const [viewport, setViewport] = useState({ x: 24, y: 10, zoom: 1 });
  const [hovered, setHovered] = useState(null);
  const [yearFocus, setYearFocus] = useState(null);
  const [playing, setPlaying] = useState(true);

  const years = useMemo(() => {
    const values = [...new Set((network?.people || []).map((person) => person.firstSeenYear))].sort(
      (a, b) => a - b
    );
    return values;
  }, [network]);

  useEffect(() => {
    if (!years.length) {
      setYearFocus(null);
      return;
    }
    if (yearFocus === null || !years.includes(yearFocus)) {
      setYearFocus(years[years.length - 1]);
    }
  }, [years, yearFocus]);

  useEffect(() => {
    if (!playing || years.length <= 1) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      setYearFocus((current) => {
        if (current === null) {
          return years[0];
        }
        const index = years.indexOf(current);
        return years[(index + 1) % years.length];
      });
    }, 1800);
    return () => window.clearInterval(interval);
  }, [playing, years]);

  useEffect(() => {
    nodesRef.current = buildNodeMap(network);
  }, [network]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;

    function resize() {
      const rect = wrapper.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);

    const people = network?.people || [];
    const edges = network?.edges || [];
    const yearList = [...new Set(people.map((person) => person.firstSeenYear))].sort((a, b) => a - b);
    const minYear = yearList[0] || 2020;
    const maxYear = yearList[yearList.length - 1] || 2024;
    const clusters = [...new Set(people.map((person) => person.cluster))];
    const bridgeIds = new Set((network?.bridgePeople || []).slice(0, 4).map((person) => person.id));

    const nodeMap = nodesRef.current;
    const edgeNodes = edges.map((edge) => ({
      edge,
      source: nodeMap.get(edge.source),
      target: nodeMap.get(edge.target),
    }));

    function targetFor(node, time) {
      const yearRatio = maxYear === minYear ? 0.5 : (node.firstSeenYear - minYear) / (maxYear - minYear);
      const clusterIndex = Math.max(clusters.indexOf(node.cluster), 0);
      const baseX = 96 + yearRatio * (width - 190);
      const clusterSpacing = (height - 170) / Math.max(clusters.length, 1);
      const baseY = 88 + clusterIndex * clusterSpacing;
      const bridgePull = bridgeIds.has(node.id) ? -clusterSpacing * 0.32 : 0;
      const yearWave = Math.sin(time * 0.0014 + node.phase) * 8;
      const orbitX = Math.cos(time * 0.0009 + node.phase) * 10;
      return {
        x: baseX + orbitX + viewport.x,
        y: baseY + bridgePull + yearWave + viewport.y,
      };
    }

    function drawTimeline() {
      for (const year of yearList) {
        const ratio = maxYear === minYear ? 0.5 : (year - minYear) / (maxYear - minYear);
        const x = 96 + ratio * (width - 190) + viewport.x;
        const active = year === yearFocus;
        context.fillStyle = active ? "rgba(111,247,255,0.22)" : "rgba(255,255,255,0.04)";
        context.fillRect(x, 36, active ? 4 : 2, height - 84);
        context.fillStyle = active ? "#6ff7ff" : "#b4ab87";
        context.fillText(String(year), x - 14, 24);
      }
    }

    function animate(time) {
      context.clearRect(0, 0, width, height);
      drawTimeline();

      for (const node of nodeMap.values()) {
        const target = targetFor(node, time);
        const focusBoost =
          yearFocus === null
            ? 1
            : node.firstSeenYear <= yearFocus
              ? 1
              : 0.2;
        node.vx += (target.x - node.x) * 0.045;
        node.vy += (target.y - node.y) * 0.045;
        node.vx *= 0.8;
        node.vy *= 0.8;
        node.x += node.vx;
        node.y += node.vy;
        node.opacity = focusBoost;
      }

      context.globalAlpha = 0.42;
      for (const pair of edgeNodes) {
        if (!pair.source || !pair.target) {
          continue;
        }
        const alpha = Math.min(pair.source.opacity, pair.target.opacity);
        if (alpha <= 0.05) {
          continue;
        }
        context.globalAlpha = 0.08 + alpha * 0.3;
        context.strokeStyle = bridgeIds.has(pair.source.id) || bridgeIds.has(pair.target.id)
          ? "rgba(111,247,255,0.24)"
          : "rgba(255,255,255,0.12)";
        context.lineWidth = Math.max(1, pair.edge.strength * 1.8) * viewport.zoom;
        context.beginPath();
        context.moveTo(pair.source.x, pair.source.y);
        context.quadraticCurveTo(
          (pair.source.x + pair.target.x) / 2,
          Math.min(pair.source.y, pair.target.y) - 18,
          pair.target.x,
          pair.target.y
        );
        context.stroke();
      }

      context.globalAlpha = 1;
      for (const node of nodeMap.values()) {
        if (node.opacity <= 0.05) {
          continue;
        }
        const radius = Math.max(6, 6 + (Number(node.score) || 0.3) * 13) * viewport.zoom;
        const focused = hovered?.id === node.id;
        context.globalAlpha = Math.max(0.18, node.opacity);
        context.fillStyle = clusterColor(node.cluster);
        context.shadowBlur = focused ? 34 : bridgeIds.has(node.id) ? 26 : 14;
        context.shadowColor = clusterColor(node.cluster);
        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = focused ? "#f5f0d8" : "#090909";
        context.lineWidth = focused ? 3 : 2;
        context.stroke();

        if (focused || node.highlight || bridgeIds.has(node.id)) {
          context.globalAlpha = 0.95;
          context.fillStyle = "#f5f0d8";
          context.fillText(node.name, node.x + radius + 8, node.y - 5);
        }
      }
      context.globalAlpha = 1;
      frameRef.current = window.requestAnimationFrame(animate);
    }

    frameRef.current = window.requestAnimationFrame(animate);

    function getPointerPosition(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function handleMove(event) {
      const point = getPointerPosition(event);
      let hit = null;
      for (const node of nodeMap.values()) {
        const radius = Math.max(6, 6 + (Number(node.score) || 0.3) * 13) * viewport.zoom;
        if (Math.hypot(node.x - point.x, node.y - point.y) <= radius + 6) {
          hit = node;
          break;
        }
      }
      setHovered((current) => (current?.id === hit?.id ? current : hit));
      if (dragRef.current.dragging) {
        const dx = event.clientX - dragRef.current.x;
        const dy = event.clientY - dragRef.current.y;
        dragRef.current = { ...dragRef.current, x: event.clientX, y: event.clientY };
        setViewport((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
      }
    }

    function handleDown(event) {
      dragRef.current = { dragging: true, x: event.clientX, y: event.clientY };
    }

    function handleUp() {
      dragRef.current = { dragging: false, x: 0, y: 0 };
    }

    function handleWheel(event) {
      event.preventDefault();
      setViewport((current) => ({
        ...current,
        zoom: Math.min(2.2, Math.max(0.7, current.zoom - event.deltaY * 0.0012)),
      }));
    }

    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("pointerup", handleUp);

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [network, viewport, hovered, yearFocus]);

  if (!network?.people?.length) {
    return (
      <div className="graph-empty">
        No network loaded yet. Import LinkedIn data or start demo mode to render the graph.
      </div>
    );
  }

  return (
    <div className="graph-shell">
      <div ref={wrapperRef} className="graph-wrapper">
        <canvas ref={canvasRef} className="graph-canvas" />
        <div className="graph-overlay">
          {hovered ? (
            <div className="hover-card">
              <strong>{hovered.name}</strong>
              <span>{hovered.cluster}</span>
              <span>{hovered.organization}</span>
              <span>{hovered.firstSeenYear}</span>
              <span>score {(Number(hovered.score) || 0).toFixed(2)}</span>
            </div>
          ) : (
            <div className="hover-card">drag canvas / wheel to zoom / scrub time / hover to inspect</div>
          )}
        </div>
      </div>

      <div className="timeline-controls">
        <button className="ghost-button" onClick={() => setPlaying((current) => !current)} type="button">
          {playing ? "PAUSE MOTION" : "PLAY MOTION"}
        </button>
        <label className="timeline-slider">
          <span>TIME FOCUS {yearFocus ?? "--"}</span>
          <input
            type="range"
            min={0}
            max={Math.max(years.length - 1, 0)}
            step={1}
            value={Math.max(years.indexOf(yearFocus), 0)}
            onChange={(event) => {
              setPlaying(false);
              setYearFocus(years[Number(event.target.value)]);
            }}
          />
        </label>
      </div>
    </div>
  );
}
