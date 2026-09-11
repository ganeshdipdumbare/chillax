function Dots({ width, height }: { width: number; height: number }) {
  const dots = [];
  for (let y = 6; y < height; y += 12) {
    for (let x = 6; x < width; x += 12) {
      dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r="1.05" fill="#d9cfc4" />);
    }
  }
  return <g>{dots}</g>;
}

export function LoungeArt() {
  return (
    <svg className="spot-art" viewBox="0 0 320 188" aria-hidden="true">
      <rect width="320" height="188" fill="#f4efe8" />
      <Dots width={320} height={188} />
      <ellipse cx="160" cy="160" rx="110" ry="12" fill="#e4dbd1" />
      <rect x="86" y="38" width="148" height="88" rx="18" fill="#1c1524" />
      <rect x="98" y="50" width="124" height="64" rx="10" fill="#7dffd0" />
      <rect x="98" y="50" width="62" height="64" rx="10" fill="#c084fc" opacity="0.9" />
      <rect x="136" y="50" width="86" height="64" rx="10" fill="#f3c77e" opacity="0.85" />
      <rect x="118" y="126" width="84" height="10" rx="5" fill="#1c1524" />
      <rect x="54" y="132" width="212" height="28" rx="14" fill="#5b3d7a" />
      <rect x="70" y="122" width="180" height="22" rx="11" fill="#7a529e" />
      <rect x="54" y="138" width="18" height="22" rx="9" fill="#f3c77e" />
      <rect x="248" y="138" width="18" height="22" rx="9" fill="#f3c77e" />
      <rect x="24" y="108" width="36" height="44" rx="10" fill="#f3c77e" />
      <circle cx="33" cy="118" r="5" fill="#fff6e4" />
      <circle cx="44" cy="122" r="4.5" fill="#ffe1a3" />
      <circle cx="38" cy="130" r="4" fill="#fff6e4" />
      <rect x="236" y="28" width="58" height="22" rx="11" fill="#7dffd0" />
      <circle cx="252" cy="39" r="4" fill="#08221c" />
      <rect x="262" y="35" width="22" height="8" rx="4" fill="#08221c" opacity="0.35" />
    </svg>
  );
}

export function PopcornArt() {
  return (
    <svg className="spot-art spot-art-sm" viewBox="0 0 180 140" aria-hidden="true">
      <rect width="180" height="140" fill="#f4efe8" />
      <Dots width={180} height={140} />
      <path d="M62 58h56l8 54H54z" fill="#f3c77e" />
      <path d="M70 58h40l6 54H64z" fill="#ffe1a3" />
      <ellipse cx="90" cy="58" rx="32" ry="12" fill="#fff6e4" />
      <circle cx="78" cy="46" r="8" fill="#fff6e4" />
      <circle cx="94" cy="40" r="9" fill="#f3c77e" />
      <circle cx="108" cy="48" r="7" fill="#ffe1a3" />
      <circle cx="86" cy="34" r="6" fill="#fff6e4" />
      <rect x="128" y="22" width="34" height="18" rx="9" fill="#c084fc" />
      <rect x="18" y="30" width="28" height="16" rx="8" fill="#7dffd0" />
    </svg>
  );
}
