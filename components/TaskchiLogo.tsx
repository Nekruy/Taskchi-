"use client";

/* ─────────────────────────────────────────────────────────────────
   TaskchiLogo  —  animated isometric-network SVG logo
   Props:
     size    : "sm" | "md" | "lg"   (default "md")
     variant : "light" | "dark" | "green"  (default "light")
     showText: boolean  (default true)
   ───────────────────────────────────────────────────────────────── */

interface Props {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "green";
  showText?: boolean;
}

const SIZE = {
  sm: { svg: 32, fontSize: 18, subSize: 8,  gap: 8  },
  md: { svg: 52, fontSize: 26, subSize: 10, gap: 10 },
  lg: { svg: 80, fontSize: 36, subSize: 12, gap: 14 },
};

const TEXT_COLOR = {
  light: { main: "#1a1a1a", sub: "#6b7280" },
  dark:  { main: "#ffffff", sub: "rgba(255,255,255,.55)" },
  green: { main: "#14A800", sub: "#00d4aa" },
};

export function TaskchiLogo({ size = "md", variant = "light", showText = true }: Props) {
  const s = SIZE[size];
  const tc = TEXT_COLOR[variant];

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: s.gap }}>
      {/* ── SVG mark ── */}
      <div style={{ width: s.svg, height: s.svg, flexShrink: 0, animation: "tcLogoFloat 3.5s ease-in-out infinite" }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <defs>
            {/* Top face gradient */}
            <linearGradient id="tc-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#14A800" />
              <stop offset="100%" stopColor="#00d4aa" />
            </linearGradient>
            {/* Right face gradient */}
            <linearGradient id="tc-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#0d8c00" />
              <stop offset="100%" stopColor="#00b892" />
            </linearGradient>
            {/* Left face gradient */}
            <linearGradient id="tc-left" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#1bcb06" />
              <stop offset="100%" stopColor="#00d4aa" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="tc-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Node glow */}
            <filter id="tc-node-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── Isometric platform ── */}
          {/* Top face */}
          <path d="M50 12 L88 32 L50 52 L12 32 Z" fill="url(#tc-top)" opacity="0.95" />
          {/* Right face */}
          <path d="M88 32 L88 62 L50 82 L50 52 Z" fill="url(#tc-right)" opacity="0.85" />
          {/* Left face */}
          <path d="M12 32 L12 62 L50 82 L50 52 Z" fill="url(#tc-left)" opacity="0.75" />

          {/* ── Edge lines for definition ── */}
          <path d="M50 12 L88 32 L50 52 L12 32 Z" stroke="rgba(255,255,255,.25)" strokeWidth="0.5" fill="none" />
          <path d="M88 32 L88 62 L50 82 L50 52 Z" stroke="rgba(255,255,255,.15)" strokeWidth="0.5" fill="none" />
          <path d="M12 32 L12 62 L50 82 L50 52 Z" stroke="rgba(255,255,255,.15)" strokeWidth="0.5" fill="none" />

          {/* ── Connection lines on top face ── */}
          {/* Center to outer nodes */}
          <g stroke="rgba(255,255,255,.70)" strokeWidth="0.8" filter="url(#tc-glow)">
            <line x1="50" y1="32" x2="34" y2="24" style={{ animation: "tcLineGlow 2.4s ease-in-out infinite" }} />
            <line x1="50" y1="32" x2="66" y2="24" style={{ animation: "tcLineGlow 2.4s ease-in-out infinite 0.3s" }} />
            <line x1="50" y1="32" x2="74" y2="36" style={{ animation: "tcLineGlow 2.4s ease-in-out infinite 0.6s" }} />
            <line x1="50" y1="32" x2="66" y2="44" style={{ animation: "tcLineGlow 2.4s ease-in-out infinite 0.9s" }} />
            <line x1="50" y1="32" x2="34" y2="44" style={{ animation: "tcLineGlow 2.4s ease-in-out infinite 1.2s" }} />
            <line x1="50" y1="32" x2="26" y2="36" style={{ animation: "tcLineGlow 2.4s ease-in-out infinite 1.5s" }} />
            {/* Outer ring connections */}
            <line x1="34" y1="24" x2="66" y2="24" style={{ animation: "tcLineGlow 3s ease-in-out infinite 0.2s" }} />
            <line x1="66" y1="24" x2="74" y2="36" style={{ animation: "tcLineGlow 3s ease-in-out infinite 0.5s" }} />
            <line x1="74" y1="36" x2="66" y2="44" style={{ animation: "tcLineGlow 3s ease-in-out infinite 0.8s" }} />
            <line x1="34" y1="44" x2="26" y2="36" style={{ animation: "tcLineGlow 3s ease-in-out infinite 1.1s" }} />
          </g>

          {/* ── Outer nodes (6) ── */}
          {[
            { cx: 34, cy: 24, delay: "0s"    },
            { cx: 66, cy: 24, delay: "0.4s"  },
            { cx: 74, cy: 36, delay: "0.8s"  },
            { cx: 66, cy: 44, delay: "1.2s"  },
            { cx: 34, cy: 44, delay: "1.6s"  },
            { cx: 26, cy: 36, delay: "2.0s"  },
          ].map(({ cx, cy, delay }, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r="3.5"
              fill="white"
              opacity="0.9"
              filter="url(#tc-node-glow)"
              style={{ animation: `tcNodePulse 2.5s ease-in-out infinite ${delay}` }}
            />
          ))}

          {/* ── Central node with pulse ring ── */}
          {/* Pulse ring */}
          <circle cx="50" cy="32" r="8"
            fill="none" stroke="rgba(255,255,255,.40)" strokeWidth="1"
            style={{ animation: "tcCenterRing 2s ease-out infinite" }}
          />
          {/* Outer ring */}
          <circle cx="50" cy="32" r="5.5"
            fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.80)" strokeWidth="1"
          />
          {/* Center dot */}
          <circle cx="50" cy="32" r="3"
            fill="white"
            filter="url(#tc-node-glow)"
            style={{ animation: "tcNodePulse 2s ease-in-out infinite" }}
          />

          {/* ── Inline keyframes (injected via style element) ── */}
          <style>{`
            @keyframes tcLogoFloat {
              0%, 100% { transform: translateY(0px);  }
              50%       { transform: translateY(-8px); }
            }
            @keyframes tcNodePulse {
              0%, 100% { opacity: 0.90; r: 3.5; }
              50%       { opacity: 1.00; r: 4.5; }
            }
            @keyframes tcLineGlow {
              0%, 100% { opacity: 0.60; }
              50%       { opacity: 1.00; }
            }
            @keyframes tcCenterRing {
              0%   { r: 5; opacity: 0.7; }
              100% { r: 14; opacity: 0; }
            }
          `}</style>
        </svg>
      </div>

      {/* ── Wordmark ── */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{
            fontWeight: 800,
            fontSize: s.fontSize,
            letterSpacing: "-0.03em",
            color: tc.main,
            lineHeight: 1,
          }}>
            Task<span style={{ color: "#14A800" }}>chi</span>
          </span>
          {size !== "sm" && (
            <span style={{
              fontSize: s.subSize,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: tc.sub,
              marginTop: 3,
              textTransform: "uppercase",
            }}>
              Маркетплейс услуг
            </span>
          )}
        </div>
      )}
    </div>
  );
}
