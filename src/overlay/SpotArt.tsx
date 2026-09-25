const INK = "#0e1113";
const CREAM = "#fbfaf4";
const PEACH = "#f8dbca";
const TERRACOTTA = "#db704c";
const SAGE = "#adb49c";
const DARK_TEAL = "#1c525d";
const DUSTY_PINK = "#b6969d";
const STONE = "#b4aea6";
const SAND = "#d6d0c3";

function DotPaper({ id, width, height, paper }: { id: string; width: number; height: number; paper: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.05" fill={INK} opacity="0.08" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={paper} />
      <rect width={width} height={height} fill={`url(#${id})`} />
    </>
  );
}

function Sparkle({ x, y, fill, size = 10 }: { x: number; y: number; fill: string; size?: number }) {
  const s = size / 2;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className="sparkle"
        fill={fill}
        d={`M0 ${-s} C1.4 ${-s * 0.2} ${s * 0.2} -1.4 ${s} 0 C${s * 0.2} 1.4 1.4 ${s * 0.2} 0 ${s} C-1.4 ${s * 0.2} ${-s * 0.2} 1.4 ${-s} 0 C${-s * 0.2} -1.4 -1.4 ${-s * 0.2} 0 ${-s}Z`}
      />
    </g>
  );
}

function Buddy({
  x,
  y,
  body,
  scale = 1,
  delay = false,
}: {
  x: number;
  y: number;
  body: string;
  scale?: number;
  delay?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={delay ? "buddy-bob buddy-bob-b" : "buddy-bob"}>
        <ellipse cx="0" cy="22" rx="18" ry="6" fill={INK} opacity="0.08" />
        <ellipse cx="0" cy="10" rx="17" ry="15" fill={body} />
        <circle cx="0" cy="-8" r="13.5" fill={body} />
        <circle cx="-11" cy="8" r="5.5" fill={body} />
        <circle cx="11" cy="8" r="5.5" fill={body} />
        <circle cx="-4.6" cy="-10" r="2.15" fill={INK} />
        <circle cx="4.6" cy="-10" r="2.15" fill={INK} />
        <circle cx="-5.4" cy="-10.8" r="0.7" fill={CREAM} />
        <circle cx="3.8" cy="-10.8" r="0.7" fill={CREAM} />
        <ellipse cx="-7.2" cy="-5.6" rx="3.2" ry="1.7" fill={TERRACOTTA} opacity="0.45" />
        <ellipse cx="7.2" cy="-5.6" rx="3.2" ry="1.7" fill={TERRACOTTA} opacity="0.45" />
        <ellipse cx="0" cy="-3.2" rx="2.4" ry="1.3" fill={INK} opacity="0.18" />
      </g>
    </g>
  );
}

export function LoungeArt() {
  return (
    <svg className="spot-art" viewBox="0 0 320 200" aria-hidden="true">
      <DotPaper id="cx-dots-lounge" width={320} height={200} paper="#c3d3ce" />
      <ellipse cx="160" cy="176" rx="118" ry="14" fill={INK} opacity="0.07" />
      <Sparkle x={38} y={36} fill={DARK_TEAL} size={12} />
      <Sparkle x={286} y={44} fill={CREAM} size={11} />
      <Sparkle x={54} y={86} fill={TERRACOTTA} size={8} />

      <rect x="28" y="118" width="18" height="28" rx="8" fill={STONE} />
      <circle cx="37" cy="108" r="16" fill={SAGE} />
      <circle cx="26" cy="102" r="9" fill="#c5cbb6" />
      <circle cx="48" cy="100" r="8" fill="#8e977a" />

      <rect x="268" y="96" width="8" height="52" rx="4" fill={STONE} />
      <ellipse cx="272" cy="90" rx="18" ry="14" className="lamp-glow" fill={PEACH} />
      <ellipse cx="272" cy="90" rx="10" ry="7" fill={CREAM} opacity="0.8" />

      <rect x="92" y="34" width="136" height="86" rx="22" fill={INK} />
      <rect x="104" y="46" width="112" height="62" rx="14" fill={SAGE} />
      <rect x="104" y="46" width="58" height="62" rx="14" fill={DUSTY_PINK} />
      <path d="M162 46h54a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14h-54V46Z" fill={TERRACOTTA} />
      <circle cx="148" cy="78" r="11" fill={CREAM} opacity="0.9" />
      <circle cx="168" cy="84" r="8" fill={INK} opacity="0.2" />
      <rect x="132" y="122" width="56" height="8" rx="4" fill={INK} />

      <rect x="58" y="138" width="204" height="30" rx="16" fill={DARK_TEAL} />
      <rect x="70" y="126" width="180" height="26" rx="13" fill="#2b6571" />
      <rect x="78" y="132" width="52" height="14" rx="7" fill="#3d7985" />
      <rect x="190" y="132" width="52" height="14" rx="7" fill="#3d7985" />
      <rect x="58" y="150" width="16" height="18" rx="8" fill={TERRACOTTA} />
      <rect x="246" y="150" width="16" height="18" rx="8" fill={TERRACOTTA} />

      <Buddy x={118} y={118} body={PEACH} scale={0.92} />
      <Buddy x={202} y={116} body={SAND} scale={0.92} delay />

      <ellipse cx="160" cy="148" rx="16" ry="9" fill={CREAM} />
      <ellipse cx="154" cy="144" rx="5" ry="4" fill={PEACH} />
      <ellipse cx="166" cy="143" rx="5.5" ry="4.2" fill={CREAM} />
      <ellipse cx="160" cy="141" rx="4.5" ry="3.6" fill={TERRACOTTA} />

      <ellipse cx="248" cy="136" rx="11" ry="7" fill={INK} />
      <circle cx="242" cy="128" r="6.5" fill={INK} />
      <circle cx="240.4" cy="126.6" r="1.1" fill={PEACH} />
      <circle cx="244.2" cy="126.6" r="1.1" fill={PEACH} />
    </svg>
  );
}

export function PopcornArt() {
  return (
    <svg className="spot-art spot-art-sm" viewBox="0 0 180 140" aria-hidden="true">
      <DotPaper id="cx-dots-popcorn" width={180} height={140} paper={PEACH} />
      <Sparkle x={28} y={28} fill={DARK_TEAL} size={10} />
      <Sparkle x={156} y={34} fill={SAGE} size={9} />
      <Sparkle x={148} y={108} fill={TERRACOTTA} size={8} />

      <ellipse cx="90" cy="118" rx="46" ry="10" fill={INK} opacity="0.07" />
      <path d="M58 62h64l10 52H48Z" fill={TERRACOTTA} />
      <path d="M66 62h48l7 52H59Z" fill="#e8906f" />
      <path d="M70 78h8l3 36h-8Z" fill={CREAM} opacity="0.55" />
      <path d="M102 78h8l3 36h-8Z" fill={CREAM} opacity="0.55" />
      <ellipse cx="90" cy="62" rx="34" ry="13" fill={CREAM} />

      <g className="kernel-pop">
        <circle cx="72" cy="48" r="11" fill={CREAM} />
        <circle cx="90" cy="40" r="13" fill={SAND} />
        <circle cx="108" cy="50" r="11" fill={CREAM} />
        <circle cx="82" cy="34" r="8" fill={CREAM} />
        <circle cx="100" cy="32" r="7" fill={SAND} />
        <circle cx="94" cy="50" r="8" fill={CREAM} />
      </g>

      <circle cx="84" cy="82" r="2.1" fill={INK} />
      <circle cx="96" cy="82" r="2.1" fill={INK} />
      <circle cx="83.3" cy="81.2" r="0.65" fill={CREAM} />
      <circle cx="95.3" cy="81.2" r="0.65" fill={CREAM} />
      <ellipse cx="80" cy="88" rx="3.2" ry="1.6" fill={CREAM} opacity="0.5" />
      <ellipse cx="100" cy="88" rx="3.2" ry="1.6" fill={CREAM} opacity="0.5" />
      <path
        d="M86 93c2.4 3 6.6 3 9 0"
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <rect x="22" y="84" width="24" height="28" rx="9" fill={SAGE} />
      <ellipse cx="34" cy="84" rx="12" ry="5" fill="#c5cbb6" />
      <rect x="32" y="58" width="4" height="28" rx="2" fill={DARK_TEAL} />
      <circle cx="34" cy="56" r="3.5" fill={DARK_TEAL} />
      <circle cx="29" cy="96" r="1.45" fill={INK} />
      <circle cx="38" cy="96" r="1.45" fill={INK} />
      <ellipse cx="33.5" cy="101" rx="3.2" ry="1.3" fill={INK} opacity="0.2" />
    </svg>
  );
}
