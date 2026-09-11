function DotPaper({ id, width, height }: { id: string; width: number; height: number }) {
  return (
    <>
      <defs>
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.05" fill="#e4d9cc" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="#f6f1ea" />
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
        <ellipse cx="0" cy="22" rx="18" ry="6" fill="#e4dbd1" opacity="0.7" />
        <ellipse cx="0" cy="10" rx="17" ry="15" fill={body} />
        <circle cx="0" cy="-8" r="13.5" fill={body} />
        <circle cx="-11" cy="8" r="5.5" fill={body} />
        <circle cx="11" cy="8" r="5.5" fill={body} />
        <circle cx="-4.6" cy="-10" r="2.15" fill="#1c1524" />
        <circle cx="4.6" cy="-10" r="2.15" fill="#1c1524" />
        <circle cx="-5.4" cy="-10.8" r="0.7" fill="#fff6e4" />
        <circle cx="3.8" cy="-10.8" r="0.7" fill="#fff6e4" />
        <ellipse cx="-7.2" cy="-5.6" rx="3.2" ry="1.7" fill="#ff8fa3" opacity="0.55" />
        <ellipse cx="7.2" cy="-5.6" rx="3.2" ry="1.7" fill="#ff8fa3" opacity="0.55" />
        <ellipse cx="0" cy="-3.2" rx="2.4" ry="1.3" fill="#1c1524" opacity="0.18" />
      </g>
    </g>
  );
}

export function LoungeArt() {
  return (
    <svg className="spot-art" viewBox="0 0 320 200" aria-hidden="true">
      <DotPaper id="cx-dots-lounge" width={320} height={200} />
      <ellipse cx="160" cy="176" rx="118" ry="14" fill="#eadfd3" />
      <Sparkle x={38} y={36} fill="#c084fc" size={12} />
      <Sparkle x={286} y={44} fill="#7dffd0" size={11} />
      <Sparkle x={54} y={86} fill="#f3c77e" size={8} />

      <rect x="28" y="118" width="18" height="28" rx="8" fill="#d9c7b0" />
      <circle cx="37" cy="108" r="16" fill="#7dffd0" />
      <circle cx="26" cy="102" r="9" fill="#9dffdc" />
      <circle cx="48" cy="100" r="8" fill="#5be0b8" />

      <rect x="268" y="96" width="8" height="52" rx="4" fill="#d9c7b0" />
      <ellipse cx="272" cy="90" rx="18" ry="14" className="lamp-glow" fill="#ffe1a3" />
      <ellipse cx="272" cy="90" rx="10" ry="7" fill="#fff6e4" opacity="0.7" />

      <rect x="92" y="34" width="136" height="86" rx="22" fill="#1c1524" />
      <rect x="104" y="46" width="112" height="62" rx="14" fill="#7dffd0" />
      <rect x="104" y="46" width="58" height="62" rx="14" fill="#c084fc" />
      <path d="M162 46h54a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14h-54V46Z" fill="#f3c77e" />
      <circle cx="148" cy="78" r="11" fill="#fff6e4" opacity="0.9" />
      <circle cx="168" cy="84" r="8" fill="#1c1524" opacity="0.2" />
      <rect x="132" y="122" width="56" height="8" rx="4" fill="#1c1524" />

      <rect x="58" y="138" width="204" height="30" rx="16" fill="#5b3d7a" />
      <rect x="70" y="126" width="180" height="26" rx="13" fill="#7a529e" />
      <rect x="78" y="132" width="52" height="14" rx="7" fill="#9b74bb" />
      <rect x="190" y="132" width="52" height="14" rx="7" fill="#9b74bb" />
      <rect x="58" y="150" width="16" height="18" rx="8" fill="#f3c77e" />
      <rect x="246" y="150" width="16" height="18" rx="8" fill="#f3c77e" />

      <Buddy x={118} y={118} body="#ffd7a8" scale={0.92} />
      <Buddy x={202} y={116} body="#b8f5e0" scale={0.92} delay />

      <ellipse cx="160" cy="148" rx="16" ry="9" fill="#fff6e4" />
      <ellipse cx="154" cy="144" rx="5" ry="4" fill="#ffe1a3" />
      <ellipse cx="166" cy="143" rx="5.5" ry="4.2" fill="#fff6e4" />
      <ellipse cx="160" cy="141" rx="4.5" ry="3.6" fill="#f3c77e" />

      <ellipse cx="248" cy="136" rx="11" ry="7" fill="#1c1524" />
      <circle cx="242" cy="128" r="6.5" fill="#1c1524" />
      <circle cx="240.4" cy="126.6" r="1.1" fill="#ffe1a3" />
      <circle cx="244.2" cy="126.6" r="1.1" fill="#ffe1a3" />
    </svg>
  );
}

export function PopcornArt() {
  return (
    <svg className="spot-art spot-art-sm" viewBox="0 0 180 140" aria-hidden="true">
      <DotPaper id="cx-dots-popcorn" width={180} height={140} />
      <Sparkle x={28} y={28} fill="#c084fc" size={10} />
      <Sparkle x={156} y={34} fill="#7dffd0" size={9} />
      <Sparkle x={148} y={108} fill="#f3c77e" size={8} />

      <ellipse cx="90" cy="118" rx="46" ry="10" fill="#eadfd3" />
      <path d="M58 62h64l10 52H48Z" fill="#f3c77e" />
      <path d="M66 62h48l7 52H59Z" fill="#ffe1a3" />
      <path d="M70 78h8l3 36h-8Z" fill="#fff6e4" opacity="0.55" />
      <path d="M102 78h8l3 36h-8Z" fill="#fff6e4" opacity="0.55" />
      <ellipse cx="90" cy="62" rx="34" ry="13" fill="#fff6e4" />

      <g className="kernel-pop">
        <circle cx="72" cy="48" r="11" fill="#fff6e4" />
        <circle cx="90" cy="40" r="13" fill="#ffe1a3" />
        <circle cx="108" cy="50" r="11" fill="#f3c77e" />
        <circle cx="82" cy="34" r="8" fill="#fff6e4" />
        <circle cx="100" cy="32" r="7" fill="#ffe1a3" />
        <circle cx="94" cy="50" r="8" fill="#fff6e4" />
      </g>

      <circle cx="84" cy="82" r="2.1" fill="#1c1524" />
      <circle cx="96" cy="82" r="2.1" fill="#1c1524" />
      <circle cx="83.3" cy="81.2" r="0.65" fill="#fff6e4" />
      <circle cx="95.3" cy="81.2" r="0.65" fill="#fff6e4" />
      <ellipse cx="80" cy="88" rx="3.2" ry="1.6" fill="#ff8fa3" opacity="0.5" />
      <ellipse cx="100" cy="88" rx="3.2" ry="1.6" fill="#ff8fa3" opacity="0.5" />
      <path
        d="M86 93c2.4 3 6.6 3 9 0"
        fill="none"
        stroke="#1c1524"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <rect x="22" y="84" width="24" height="28" rx="9" fill="#7dffd0" />
      <ellipse cx="34" cy="84" rx="12" ry="5" fill="#b8f5e0" />
      <rect x="32" y="58" width="4" height="28" rx="2" fill="#c084fc" />
      <circle cx="34" cy="56" r="3.5" fill="#c084fc" />
      <circle cx="29" cy="96" r="1.45" fill="#08221c" />
      <circle cx="38" cy="96" r="1.45" fill="#08221c" />
      <ellipse cx="33.5" cy="101" rx="3.2" ry="1.3" fill="#08221c" opacity="0.2" />
    </svg>
  );
}
