const INK = "#0e1113";
const CREAM = "#fbfaf4";
const PEACH = "#f8dbca";
const TERRACOTTA = "#db704c";
const CORAL = "#e8906f";
const SAGE = "#adb49c";
const DARK_TEAL = "#1c525d";
const MIST = "#c3d3ce";
const SAND = "#d6d0c3";
const BUTTER = "#f6c453";
const TEAR = "#9fd0de";
const TEAR_DEEP = "#7fb6c6";

function outline(width: number) {
  return { stroke: INK, strokeWidth: width, strokeLinejoin: "round", strokeLinecap: "round" } as const;
}

export function LoungeArt() {
  return (
    <svg className="spot-art spot-art-lounge" viewBox="0 0 640 400" aria-hidden="true">
      <defs>
        <pattern id="hero-dots-day" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="1.2" fill="#ecc3ad" />
        </pattern>
        <pattern id="hero-dots-night" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="1.2" fill="#24606c" />
        </pattern>
        <clipPath id="hero-night">
          <rect x="320" y="0" width="320" height="400" />
        </clipPath>
        <clipPath id="hero-couch">
          <rect x="70" y="194" width="500" height="100" rx="31" />
          <rect x="60" y="270" width="520" height="56" rx="19" />
          <rect x="32" y="234" width="60" height="100" rx="26" />
          <rect x="548" y="234" width="60" height="100" rx="26" />
        </clipPath>
        <clipPath id="hero-sky-day">
          <rect x="40" y="40" width="112" height="92" rx="14" />
        </clipPath>
      </defs>

      {/* Day room */}
      <rect width="320" height="400" fill={PEACH} />
      <rect width="320" height="400" fill="url(#hero-dots-day)" />
      <rect y="322" width="320" height="78" fill="#efc7b1" />
      <path d="M0 322h320" {...outline(2.5)} fill="none" opacity="0.5" />

      {/* Night room */}
      <rect x="320" width="320" height="400" fill={DARK_TEAL} />
      <rect x="320" width="320" height="400" fill="url(#hero-dots-night)" />
      <rect x="320" y="322" width="320" height="78" fill="#163f48" />
      <path d="M320 322h320" {...outline(2.5)} fill="none" opacity="0.5" />

      {/* Day window: sun in sunglasses */}
      <rect x="40" y="40" width="112" height="92" rx="14" fill="#cfe6ea" />
      <g clipPath="url(#hero-sky-day)">
        <g stroke="#f2b33d" strokeWidth="4" strokeLinecap="round">
          <path d="M96 52v-8M96 120v8M60 86h-8M140 86h-8M71 61l-6-6M121 61l6-6M71 111l-6 6M121 111l6 6" />
        </g>
        <circle cx="96" cy="86" r="22" fill={BUTTER} {...outline(2.5)} />
        <path d="M80 80h12l-1 7a5 5 0 0 1-5 4h0a5 5 0 0 1-5-4zM100 80h12l-1 7a5 5 0 0 1-5 4h0a5 5 0 0 1-5-4z" fill={INK} />
        <path d="M92 81h8" {...outline(2.5)} fill="none" />
        <path d="M88 97q8 6 16 0" {...outline(2.5)} fill="none" />
        <path d="M118 120c4-8 18-8 22 0" fill={CREAM} {...outline(2.5)} />
      </g>
      <rect x="40" y="40" width="112" height="92" rx="14" fill="none" {...outline(3.5)} />

      {/* Night window: moon in a nightcap */}
      <rect x="488" y="40" width="112" height="92" rx="14" fill="#0e2a31" />
      <path className="lounge-twinkle" d="M512 60l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={PEACH} />
      <path className="lounge-twinkle" style={{ animationDelay: "0.8s" }} d="M582 110l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill={SAGE} />
      <circle cx="545" cy="92" r="21" fill={CREAM} {...outline(2.5)} />
      <path d="M528 76c4-20 26-26 42-16l10 -10c4 0 6 4 4 6l-8 8c4 6 0 8-4 6-12-6-30-4-44 6z" fill={TERRACOTTA} {...outline(2.5)} />
      <circle cx="586" cy="50" r="5" fill={CREAM} {...outline(2.5)} />
      <path d="M533 92q4 4 8 0M549 92q4 4 8 0" {...outline(2.5)} fill="none" />
      <ellipse cx="545" cy="103" rx="3.5" ry="2.5" fill={INK} />
      <g className="lounge-snore" fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="700" fill={MIST}>
        <text x="566" y="88" fontSize="11">z</text>
        <text x="574" y="78" fontSize="8">z</text>
      </g>
      <rect x="488" y="40" width="112" height="92" rx="14" fill="none" {...outline(3.5)} />

      {/* Wall clocks: 3:00 PM here, 2:00 AM there */}
      <circle cx="232" cy="72" r="20" fill={CREAM} {...outline(3.5)} />
      <path d="M232 72v-13M232 72h10" {...outline(2.5)} fill="none" />
      <circle cx="408" cy="72" r="20" fill={CREAM} {...outline(3.5)} />
      <path d="M408 72v-13M408 72l8.5-5" {...outline(2.5)} fill="none" />
      <g fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
        <text x="232" y="110" fill={DARK_TEAL}>3:00 PM</text>
        <text x="408" y="110" fill={PEACH}>2:00 AM</text>
      </g>

      {/* Couch */}
      <ellipse cx="320" cy="340" rx="280" ry="10" fill={INK} opacity="0.16" />
      <rect x="84" y="322" width="14" height="18" rx="4" fill={INK} />
      <rect x="542" y="322" width="14" height="18" rx="4" fill={INK} />
      <rect x="72" y="196" width="496" height="96" rx="30" fill={TERRACOTTA} {...outline(3.5)} />
      <path d="M196 206v70M444 206v70" {...outline(2.5)} fill="none" opacity="0.4" />
      <rect x="62" y="272" width="516" height="52" rx="18" fill={CORAL} {...outline(3.5)} />
      <path d="M196 278v40M444 278v40" {...outline(2.5)} fill="none" opacity="0.4" />
      <rect x="34" y="236" width="56" height="96" rx="24" fill={TERRACOTTA} {...outline(3.5)} />
      <rect x="550" y="236" width="56" height="96" rx="24" fill={TERRACOTTA} {...outline(3.5)} />
      <g clipPath="url(#hero-night)">
        <g clipPath="url(#hero-couch)">
          <rect x="320" y="190" width="300" height="150" fill={INK} opacity="0.2" />
        </g>
      </g>

      {/* Tissue box and casualties */}
      <rect x="100" y="244" width="46" height="30" rx="5" fill={CREAM} {...outline(3.5)} />
      <path d="M112 252h22" {...outline(2.5)} fill="none" />
      <path d="M116 252c-6-14 4-20 8-12 2-10 14-8 10 2 0 4-2 8-4 10" fill={CREAM} {...outline(2.5)} />
      <g fill={CREAM} {...outline(2.5)}>
        <path d="M60 352c-4-8 6-14 12-8 6-6 16 0 10 8 4 6-4 12-10 8-6 4-16-2-12-8z" />
        <path d="M112 368c-4-7 5-12 10-7 5-5 14 0 9 7 3 5-4 10-9 7-5 3-14-2-10-7z" />
        <path d="M160 350c-3-6 4-10 8-6 4-4 11 0 7 6 3 4-3 8-7 6-4 3-11-2-8-6z" />
        <path d="M30 380c-3-6 4-10 8-6 4-4 11 0 7 6 3 4-3 8-7 6-4 3-11-2-8-6z" />
      </g>
      <path d="M118 360l6 4M66 350l8 3" {...outline(2.5)} fill="none" opacity="0.5" />

      {/* Day friend: absolutely sobbing */}
      <g className="lounge-sob">
        <path d="M142 292c-6-58 18-104 52-104s58 46 52 104z" fill={SAGE} {...outline(3.5)} />
        <path d="M166 226l14 7-14 7M222 226l-14 7 14 7" {...outline(3.5)} fill="none" />
        <path d="M178 256c0-10 32-10 32 0 0 14-8 20-16 20s-16-6-16-20z" fill={INK} />
        <path d="M184 270c4-5 16-5 20 0-4 4-16 4-20 0z" fill={TERRACOTTA} />
        <path d="M168 242c-6 14-4 30 -10 46M220 242c6 14 4 30 10 46" stroke={TEAR_DEEP} strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M246 268c10-4 16 4 12 10" fill={SAGE} {...outline(3.5)} />
        <path d="M250 262c-4-10 4-18 12-12 6-6 16 2 10 10 4 8-6 14-12 8-6 4-12-2-10-6z" fill={CREAM} {...outline(2.5)} />
      </g>
      <path {...outline(2.5)} className="lounge-tear" d="M152 214c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" fill={TEAR} />
      <path {...outline(2.5)} className="lounge-tear lounge-tear-b" d="M238 212c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" fill={TEAR} />
      <circle cx="204" cy="190" r="7" fill={CREAM} {...outline(2.5)} />
      <text x="88" y="196" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="15" fontStyle="italic" fontWeight="700" fill={DARK_TEAL} transform="rotate(-8 88 196)">*sob*</text>

      {/* Popcorn flying across the gap */}
      <path d="M505 236Q380 40 206 186" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity="0.35" />
      <g className="lounge-kernel"><circle r="7" fill={CREAM} {...outline(2.5)} /></g>
      <g className="lounge-kernel lounge-kernel-b"><circle r="6" fill={BUTTER} {...outline(2.5)} /></g>
      <g className="lounge-kernel lounge-kernel-c"><circle r="6.5" fill={CREAM} {...outline(2.5)} /></g>

      {/* Night friend: dying of laughter */}
      <g className="lounge-howl">
        <path d="M398 292c-6-58 18-104 52-104s58 46 52 104z" fill={CREAM} {...outline(3.5)} />
        <path d="M422 232q8-12 16 0M462 232q8-12 16 0" {...outline(3.5)} fill="none" />
        <path d="M426 248h48c0 22-12 32-24 32s-24-10-24-32z" fill={INK} {...outline(2.5)} />
        <path d="M436 270c6-6 22-6 28 0-6 8-22 8-28 0z" fill={TERRACOTTA} />
        <path d="M428 249h44" stroke={CREAM} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="416" cy="250" rx="7" ry="4" fill={TERRACOTTA} opacity="0.5" />
        <ellipse cx="484" cy="250" rx="7" ry="4" fill={TERRACOTTA} opacity="0.5" />
        <path d="M412 228c-4 4-6 8-2 10M488 228c4 4 6 8 2 10" stroke={TEAR} strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
      <g transform="rotate(-10 508 270)">
        <path d="M490 246h36l-5 42h-26z" fill={CREAM} {...outline(3.5)} />
        <path d="M499 246l2 42M517 246l-2 42" stroke={TERRACOTTA} strokeWidth="6" />
        <path d="M490 246h36l-5 42h-26z" fill="none" {...outline(3.5)} />
        <g fill={CREAM} {...outline(2.5)}>
          <circle cx="496" cy="242" r="7" />
          <circle cx="508" cy="236" r="8" />
          <circle cx="520" cy="242" r="7" />
        </g>
      </g>
      <g fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="800" fill={BUTTER}>
        <text x="372" y="184" fontSize="20" transform="rotate(-14 372 184)">HA</text>
        <text x="464" y="164" fontSize="26" transform="rotate(10 464 164)">HA!</text>
      </g>

      {/* The cat, who has seen this movie and is not impressed */}
      <g>
        <path className="lounge-cat-tail" d="M566 190c20 0 28-12 22-26" stroke={INK} strokeWidth="10" strokeLinecap="round" fill="none" />
        <path className="lounge-cat-tail" d="M566 190c20 0 28-12 22-26" stroke={SAND} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M528 200c-4-24 6-38 22-38s26 14 22 38z" fill={SAND} {...outline(3.5)} />
        <path d="M534 150l2-18 12 12M566 150l-2-18-12 12" fill={SAND} {...outline(3.5)} />
        <circle cx="550" cy="156" r="16" fill={SAND} {...outline(3.5)} />
        <path d="M540 154h7M553 154h7" {...outline(3.5)} fill="none" />
        <path d="M541 156a3 2.4 0 0 0 6 0M554 156a3 2.4 0 0 0 6 0" fill={BUTTER} />
        <path d="M547 164h6" {...outline(2.5)} fill="none" />
        <path d="M530 162l-8-1M530 166l-8 2M570 162l8-1M570 166l8 2" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* The seam between two living rooms */}
      <path d="M320 0v400" stroke={CREAM} strokeWidth="3" strokeDasharray="1 10" strokeLinecap="round" opacity="0.9" />
      <rect x="294" y="296" width="52" height="30" rx="15" fill={INK} stroke={CREAM} strokeWidth="2.5" />
      <path d="M320 318c-10-6-12-10-12-13a5 5 0 0 1 12-2 5 5 0 0 1 12 2c0 3-2 7-12 13z" fill={TERRACOTTA} />
    </svg>
  );
}

export function DisguiseArt() {
  return (
    <svg className="spot-art spot-art-disguise" viewBox="0 0 320 200" aria-hidden="true">
      <defs>
        <pattern id="disguise-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.05" fill="#aabbb6" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={MIST} />
      <rect width="320" height="200" fill="url(#disguise-dots)" />
      <ellipse cx="226" cy="184" rx="66" ry="8" fill={INK} opacity="0.14" />

      {/* The lounge card */}
      <rect x="20" y="30" width="124" height="148" rx="18" fill={CREAM} {...outline(3)} />
      <text x="34" y="54" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="11" fontWeight="800" fill={INK}>Pick a face</text>
      <g {...outline(2)}>
        <circle cx="48" cy="80" r="13" fill={PEACH} />
        <circle cx="82" cy="80" r="13" fill={SAGE} />
        <circle cx="48" cy="114" r="13" fill={DARK_TEAL} />
        <circle cx="82" cy="114" r="13" fill={SAND} />
        <circle cx="116" cy="80" r="13" fill={BUTTER} />
      </g>
      <g fill={INK}>
        <circle cx="44" cy="78" r="1.8" /><circle cx="52" cy="78" r="1.8" />
        <circle cx="78" cy="78" r="1.8" /><circle cx="86" cy="78" r="1.8" />
        <circle cx="112" cy="78" r="1.8" /><circle cx="120" cy="78" r="1.8" />
        <circle cx="78" cy="112" r="1.8" /><circle cx="86" cy="112" r="1.8" />
      </g>
      <circle cx="44" cy="112" r="1.8" fill={CREAM} /><circle cx="52" cy="112" r="1.8" fill={CREAM} />
      <path d="M44 84q4 3 8 0M78 84q4 3 8 0M112 84q4 4 8 0" {...outline(2)} fill="none" />
      <path d="M44 118q4 3 8 0" stroke={CREAM} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M78 118h8" {...outline(2)} fill="none" />
      <path d="M38 69l3-7 5 5M58 69l-3-7-5 5" fill={PEACH} {...outline(2)} />
      <path d="M107 68l3-8 6 5 6-5 3 8z" fill={TERRACOTTA} {...outline(2)} />
      <g className="disguise-pick">
        <circle cx="116" cy="114" r="13" fill={PEACH} {...outline(2)} />
        <circle cx="116" cy="114" r="18" fill="none" stroke={TERRACOTTA} strokeWidth="2.5" strokeDasharray="4 4" />
        <circle cx="112" cy="110" r="3" fill={CREAM} {...outline(2)} />
        <circle cx="120" cy="110" r="3" fill={CREAM} {...outline(2)} />
        <circle cx="116" cy="115" r="3" fill={CORAL} {...outline(2)} />
        <path d="M110 120q3-3 6-1 3-2 6 1" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
      <rect x="34" y="144" width="96" height="22" rx="11" fill={INK} />
      <text x="82" y="159" textAnchor="middle" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="10.5" fontWeight="700" fill={CREAM}>Join party</text>

      {/* Speech bubble */}
      <path d="M164 14h130a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12h-66l-10 10-2-10h-52a12 12 0 0 1-12-12v-22a12 12 0 0 1 12-12z" fill={CREAM} {...outline(2)} />
      <g fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="11" fontWeight="700" fill={INK} textAnchor="middle">
        <text x="229" y="33">nobody will ever</text>
        <text x="229" y="48">know it&#8217;s me.</text>
      </g>

      {/* The master of disguise */}
      <g className="disguise-smug">
        <path d="M182 180c-5-52 14-92 44-92s49 40 44 92z" fill={PEACH} {...outline(3)} />
        <g className="disguise-brows">
          <path d="M200 106q10-7 20-1M232 105q10-6 20 1" stroke={INK} strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>
        <circle cx="211" cy="120" r="10" fill={CREAM} fillOpacity="0.55" {...outline(3)} />
        <circle cx="241" cy="120" r="10" fill={CREAM} fillOpacity="0.55" {...outline(3)} />
        <path d="M221 120h10" {...outline(3)} fill="none" />
        <circle cx="207" cy="121" r="2.6" fill={INK} />
        <circle cx="237" cy="121" r="2.6" fill={INK} />
        <ellipse cx="226" cy="136" rx="10" ry="12" fill={CORAL} {...outline(3)} />
        <ellipse cx="222" cy="131" rx="3" ry="2" fill={CREAM} opacity="0.7" />
        <path d="M202 154c8-10 18-8 24-3 6-5 16-7 24 3-10 6-17 4-24 0-7 4-14 6-24 0z" fill={INK} {...outline(2)} />
        <ellipse cx="200" cy="146" rx="6" ry="3.5" fill={TERRACOTTA} opacity="0.45" />
        <ellipse cx="254" cy="146" rx="6" ry="3.5" fill={TERRACOTTA} opacity="0.45" />
      </g>
      {/* Hand mirror */}
      <path d="M270 150c10-2 14 6 8 10" fill={PEACH} {...outline(3)} />
      <path d="M282 152l8-20" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="294" cy="116" r="16" fill="#cfe6ea" {...outline(3)} />
      <path className="disguise-glint" d="M286 110l8-8M288 118l12-12" stroke={CREAM} strokeWidth="2.5" strokeLinecap="round" />

      {/* Rejected costume */}
      <path d="M160 186l12-26 14 24z" fill={SAGE} {...outline(2)} />
      <path d="M166 176l12 2M163 182l18 2" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
      <circle cx="172" cy="158" r="3.5" fill={TERRACOTTA} {...outline(2)} />
    </svg>
  );
}

export function ChatArt() {
  return (
    <svg className="spot-art spot-art-chat" viewBox="0 0 320 200" aria-hidden="true">
      <defs>
        <pattern id="chat-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.05" fill="#aabbb6" />
        </pattern>
        <clipPath id="chat-screen">
          <rect x="26" y="34" width="162" height="92" rx="10" />
        </clipPath>
      </defs>
      <rect width="320" height="200" fill={MIST} />
      <rect width="320" height="200" fill="url(#chat-dots)" />

      {/* The TV, playing something extremely ill-advised */}
      <rect x="16" y="24" width="182" height="112" rx="16" fill={INK} />
      <rect x="26" y="34" width="162" height="92" rx="10" fill="#0e2a31" />
      <g clipPath="url(#chat-screen)">
        <rect x="26" y="112" width="162" height="14" fill="#163f48" />
        <rect x="122" y="54" width="40" height="64" fill="#081c21" />
        <path d="M122 54l-12 6v62l12-4z" fill={DARK_TEAL} stroke={MIST} strokeWidth="1.5" strokeLinejoin="round" />
        <g className="chat-peek">
          <path d="M138 118v-36c0-10 6-16 14-16s14 6 14 16v36l-5-4-4 4-5-4-4 4-5-4z" fill={CREAM} />
          <ellipse cx="147" cy="82" rx="2.6" ry="3.6" fill={INK} />
          <ellipse cx="157" cy="82" rx="2.6" ry="3.6" fill={INK} />
          <ellipse cx="152" cy="94" rx="3.5" ry="4.5" fill={INK} />
        </g>
        <path d="M76 118c-2-24 8-38 20-38s22 14 20 38z" fill={PEACH} />
        <circle cx="102" cy="94" r="2" fill={INK} />
        <circle cx="110" cy="94" r="2" fill={INK} />
        <path d="M112 104l14-4" stroke={PEACH} strokeWidth="5" strokeLinecap="round" />
        <circle cx="44" cy="52" r="1.8" fill={TERRACOTTA} />
        <circle cx="50" cy="52" r="1.8" fill={TERRACOTTA} />
      </g>
      <rect x="80" y="138" width="54" height="6" rx="3" fill={INK} />

      {/* Viewer one: behind the pillow, regretting everything */}
      <g className="chat-shiver">
        <path d="M30 200c-4-36 10-62 32-62s36 26 32 62z" fill={PEACH} {...outline(3)} />
        <circle cx="54" cy="160" r="7" fill={CREAM} {...outline(2)} />
        <circle cx="72" cy="160" r="7" fill={CREAM} {...outline(2)} />
        <circle cx="55" cy="161" r="2.8" fill={INK} />
        <circle cx="73" cy="161" r="2.8" fill={INK} />
        <path d="M86 146c0 0-5 7-5 10a5 5 0 0 0 10 0c0-3-5-10-5-10z" fill={TEAR} {...outline(2)} />
      </g>
      <rect x="34" y="168" width="58" height="40" rx="12" fill={TERRACOTTA} {...outline(3)} transform="rotate(-8 63 188)" />
      <path d="M46 180l34-5" stroke={CREAM} strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* Viewer two: has seen worse */}
      <path d="M118 200c-4-34 10-58 30-58s34 24 30 58z" fill={SAGE} {...outline(3)} />
      <path d="M134 166h8M154 166h8" {...outline(3)} fill="none" />
      <ellipse className="chat-chew" cx="148" cy="180" rx="6" ry="3" fill={INK} />
      <path d="M172 190h22l-3 14h-16z" fill={CREAM} {...outline(2)} />
      <path d="M180 190l-1 14M186 190l-1 14" stroke={TERRACOTTA} strokeWidth="3" />
      <circle cx="178" cy="187" r="4" fill={CREAM} {...outline(2)} />
      <circle cx="186" cy="185" r="4.5" fill={CREAM} {...outline(2)} />

      {/* The party chat, docked right */}
      <rect x="208" y="12" width="102" height="178" rx="18" fill={INK} />
      <g stroke={INK} strokeWidth="2">
        <circle cx="224" cy="30" r="7" fill={PEACH} />
        <circle cx="236" cy="30" r="7" fill={SAGE} />
        <circle cx="248" cy="30" r="7" fill={TERRACOTTA} />
      </g>
      <text x="260" y="34" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="10" fontWeight="700" fill={SAGE}>3 here</text>
      <g fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="9.5" fontWeight="700">
        <rect x="218" y="48" width="78" height="20" rx="10" fill={SAGE} />
        <text x="228" y="61.5" fill={INK}>don&#8217;t open it</text>
        <rect x="228" y="74" width="72" height="20" rx="10" fill={PEACH} />
        <text x="238" y="87.5" fill={INK}>NOOOOOO</text>
        <rect x="218" y="100" width="84" height="20" rx="10" fill={TERRACOTTA} />
        <text x="227" y="113.5" fill={INK}>she opened it &#128128;</text>
      </g>
      <rect x="218" y="128" width="42" height="18" rx="9" fill="#2c3134" />
      <circle className="chat-dot" cx="230" cy="137" r="2.6" fill={CREAM} />
      <circle className="chat-dot chat-dot-b" cx="239" cy="137" r="2.6" fill={CREAM} />
      <circle className="chat-dot chat-dot-c" cx="248" cy="137" r="2.6" fill={CREAM} />
      <rect x="218" y="160" width="82" height="20" rx="10" fill="none" stroke="#2c3134" strokeWidth="2" />
      <text x="228" y="173.5" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="9.5" fill="#6b7377">say something&#8230;</text>
    </svg>
  );
}

export function ReactionsArt() {
  return (
    <svg className="spot-art spot-art-reactions" viewBox="0 0 320 200" aria-hidden="true">
      <defs>
        <pattern id="reactions-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.05" fill="#e6c9b8" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={PEACH} />
      <rect width="320" height="200" fill="url(#reactions-dots)" />
      <ellipse cx="150" cy="184" rx="64" ry="8" fill={INK} opacity="0.14" />

      {/* Reactions in flight */}
      <g className="reactions-float">
        <path d="M52 76c-16-10-22-18-22-26a10 10 0 0 1 22-4 10 10 0 0 1 22 4c0 8-6 16-22 26z" fill={TERRACOTTA} {...outline(3)} />
        <path d="M38 48a5 5 0 0 1 6-4" stroke={CREAM} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
      <g className="reactions-float reactions-float-b">
        <circle cx="262" cy="52" r="20" fill={BUTTER} {...outline(3)} />
        <path d="M250 46q4-6 8 0M266 46q4-6 8 0" {...outline(2)} fill="none" />
        <path d="M250 56h24c0 10-6 14-12 14s-12-4-12-14z" fill={INK} />
        <path d="M256 64c3-3 9-3 12 0-3 3-9 3-12 0z" fill={TERRACOTTA} />
        <path d="M244 44c-6 2-8 8-6 12M280 44c6 2 8 8 6 12" stroke={TEAR_DEEP} strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
      <g className="reactions-float reactions-float-c">
        <path d="M276 112c-10 0-16-8-14-18 2-6 6-8 6-14 6 4 8 8 8 12 2-4 4-6 4-10 8 6 10 14 8 20-2 6-6 10-12 10z" fill={CORAL} {...outline(3)} />
        <path d="M276 108c-4 0-6-4-4-8 2-2 4-4 4-6 4 4 6 8 4 12-1 2-2 2-4 2z" fill={BUTTER} />
      </g>
      <g className="reactions-float reactions-float-b">
        <rect x="22" y="104" width="44" height="22" rx="11" fill={DARK_TEAL} {...outline(2)} transform="rotate(-10 44 115)" />
        <text x="44" y="120" textAnchor="middle" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="12" fontWeight="800" fill={CREAM} transform="rotate(-10 44 115)">OMG</text>
      </g>

      {/* Kernels popping out mid-gasp */}
      <g {...outline(2)} fill={CREAM}>
        <circle className="reactions-pop" cx="124" cy="46" r="7" />
        <circle className="reactions-pop" style={{ animationDelay: "0.4s" }} cx="152" cy="26" r="8" />
        <circle className="reactions-pop" style={{ animationDelay: "0.8s" }} cx="182" cy="42" r="7" />
        <circle className="reactions-pop" style={{ animationDelay: "1.2s" }} cx="104" cy="68" r="6" fill={BUTTER} />
        <circle className="reactions-pop" style={{ animationDelay: "0.6s" }} cx="200" cy="66" r="6" fill={BUTTER} />
      </g>
      <path d="M116 62l-6-8M150 50v-10M186 58l6-8" stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

      {/* The popcorn bucket, who did not see that coming */}
      <g className="reactions-gasp">
        <g {...outline(2)} fill={CREAM}>
          <circle cx="122" cy="88" r="11" />
          <circle cx="140" cy="80" r="12" />
          <circle cx="160" cy="80" r="12" fill={BUTTER} />
          <circle cx="178" cy="88" r="11" />
          <circle cx="150" cy="70" r="9" />
        </g>
        <path d="M110 94h80l-12 86h-56z" fill={CREAM} {...outline(3)} />
        <path d="M128 94h14l-2 86h-12zM158 94h14l-4 86h-12z" fill={TERRACOTTA} />
        <path d="M110 94h80l-12 86h-56z" fill="none" {...outline(3)} />
        <path d="M108 94h84" {...outline(3)} />
        <path d="M126 114l10-4M164 110l10 4" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="134" cy="126" r="8" fill={CREAM} {...outline(2)} />
        <circle cx="166" cy="126" r="8" fill={CREAM} {...outline(2)} />
        <circle cx="134" cy="127" r="3" fill={INK} />
        <circle cx="166" cy="127" r="3" fill={INK} />
        <ellipse cx="150" cy="152" rx="8" ry="11" fill={INK} {...outline(2)} />
        <path d="M126 140c-12-6-18 4-16 10M174 140c12-6 18 4 16 10" fill="none" {...outline(3)} />
      </g>

      {/* The soda, who has fainted */}
      <ellipse cx="248" cy="184" rx="34" ry="5" fill={TEAR_DEEP} opacity="0.6" />
      <g transform="rotate(-82 248 168)">
        <path d="M234 152h28l-3 36h-22z" fill={SAGE} {...outline(3)} />
        <rect x="232" y="146" width="32" height="8" rx="3" fill={CREAM} {...outline(2)} />
        <path d="M252 146l6-22h8" fill="none" stroke={DARK_TEAL} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M240 162l6 6M246 162l-6 6M252 162l6 6M258 162l-6 6" {...outline(2)} fill="none" />
        <path d="M244 178q5-4 10 0" {...outline(2)} fill="none" />
      </g>
      <g className="reactions-spin">
        <path d="M214 140l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={BUTTER} {...outline(2)} />
      </g>
      <path d="M226 132l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={DARK_TEAL} />
    </svg>
  );
}

export function DevModeArt() {
  return (
    <svg className="spot-art spot-art-devmode" viewBox="0 0 320 200" aria-hidden="true">
      <defs>
        <pattern id="devmode-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.05" fill="#aabbb6" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={MIST} />
      <rect width="320" height="200" fill="url(#devmode-dots)" />
      <ellipse cx="240" cy="186" rx="52" ry="7" fill={INK} opacity="0.14" />

      {/* The famous switch */}
      <text x="26" y="62" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="11" fontWeight="800" letterSpacing="1.4" fill={DARK_TEAL}>DEVELOPER MODE</text>
      <rect className="devmode-track" x="24" y="72" width="152" height="68" rx="34" fill={DARK_TEAL} stroke={INK} strokeWidth="3.5" />
      <text x="44" y="112" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="14" fontWeight="800" fill={CREAM}>ON</text>
      <g className="devmode-knob">
        <circle cx="142" cy="106" r="27" fill={CREAM} {...outline(3)} />
        <path d="M132 100q4-5 8 0M146 100q4-5 8 0" {...outline(2)} fill="none" />
        <path d="M136 112q6 6 12 0" {...outline(2)} fill="none" />
      </g>
      <path {...outline(2)} className="devmode-twinkle" d="M184 62l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={BUTTER} />
      <path className="devmode-twinkle" style={{ animationDelay: "0.5s" }} d="M20 154l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={TERRACOTTA} />

      {/* Wrench, used for nothing */}
      <g transform="rotate(-16 110 176)">
        <rect x="72" y="171" width="60" height="11" rx="5.5" fill={SAGE} {...outline(2)} />
        <circle cx="140" cy="176" r="12" fill={SAGE} {...outline(2)} />
        <rect x="142" y="171" width="13" height="10" fill={MIST} />
      </g>

      {/* Speech bubble */}
      <path d="M190 10h110a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10h-46l-10 10-2-10h-52a10 10 0 0 1-10-10v-20a10 10 0 0 1 10-10z" fill={CREAM} {...outline(2)} />
      <text x="245" y="34" textAnchor="middle" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="11.5" fontWeight="700" fill={INK}>I&#8217;m a developer now.</text>

      {/* The new developer */}
      <g className="devmode-cheer">
        <path d="M206 140l-18-28M274 140l18-28" stroke={INK} strokeWidth="15" strokeLinecap="round" />
        <path d="M206 140l-18-28M274 140l18-28" stroke={SAND} strokeWidth="9" strokeLinecap="round" />
        <path d="M196 184c-5-50 14-86 44-86s49 36 44 86z" fill={SAND} {...outline(3)} />
        <path d="M208 104c0-26 64-26 64 0z" fill={BUTTER} {...outline(3)} />
        <rect x="200" y="100" width="80" height="9" rx="4.5" fill={BUTTER} {...outline(3)} />
        <path d="M240 82v14" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M222 130q6-8 12 0M246 130q6-8 12 0" {...outline(3)} fill="none" />
        <path d="M226 142h28c0 12-7 18-14 18s-14-6-14-18z" fill={INK} {...outline(2)} />
        <path d="M232 154c4-3 12-3 16 0-4 3-12 3-16 0z" fill={TERRACOTTA} />
        <ellipse cx="216" cy="144" rx="6" ry="3.5" fill={TERRACOTTA} opacity="0.45" />
        <ellipse cx="264" cy="144" rx="6" ry="3.5" fill={TERRACOTTA} opacity="0.45" />
      </g>
      <path className="devmode-sweat" d="M204 118c0 0-5 7-5 10a5 5 0 0 0 10 0c0-3-5-10-5-10z" fill={TEAR} stroke={INK} strokeWidth="2" />
    </svg>
  );
}

export function StillWatchingArt() {
  return (
    <svg className="spot-art spot-art-still-watching" viewBox="0 0 320 200" aria-hidden="true">
      <defs>
        <pattern id="still-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.05" fill="#e6c9b8" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={PEACH} />
      <rect width="320" height="200" fill="url(#still-dots)" />

      {/* The TV, judging gently */}
      <rect x="14" y="18" width="146" height="90" rx="14" fill={INK} />
      <rect x="22" y="26" width="130" height="74" rx="8" fill={DARK_TEAL} />
      <g fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="800" fill={CREAM} textAnchor="middle">
        <text x="87" y="52" fontSize="11.5">Are you still</text>
        <text x="87" y="67" fontSize="11.5">watching?</text>
      </g>
      <g className="still-watching-blink">
        <rect x="58" y="76" width="58" height="16" rx="8" fill={CREAM} />
        <text x="87" y="88" textAnchor="middle" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="9.5" fontWeight="700" fill={INK}>Yes&#8230;?</text>
      </g>
      <rect x="66" y="110" width="42" height="5" rx="2.5" fill={INK} />

      {/* Couch */}
      <ellipse cx="220" cy="190" rx="110" ry="7" fill={INK} opacity="0.14" />
      <rect x="128" y="104" width="200" height="62" rx="22" fill={TERRACOTTA} {...outline(3)} />
      <rect x="116" y="148" width="214" height="36" rx="14" fill={CORAL} {...outline(3)} />
      <rect x="104" y="126" width="36" height="62" rx="16" fill={TERRACOTTA} {...outline(3)} />

      {/* Out cold */}
      <g className="still-watching-breathe">
        <path d="M134 152c0-22 20-36 52-36h68c30 0 52 14 52 36z" fill={CREAM} {...outline(3)} />
      </g>
      <path d="M148 132q5 5 10 0M166 130q5 5 10 0" {...outline(3)} fill="none" />
      <ellipse cx="164" cy="143" rx="4.5" ry="3.5" fill={INK} />
      <path {...outline(2)} className="still-watching-drool" d="M160 146c-1 6-3 10-1 14a3 3 0 0 0 5-2c0-4-2-8-4-12z" fill={TEAR} />
      <ellipse cx="180" cy="140" rx="5.5" ry="3" fill={TERRACOTTA} opacity="0.45" />
      <g fontFamily="Helvetica Neue, Arial, sans-serif" fontWeight="800" fill={DARK_TEAL}>
        <text className="still-watching-z" x="160" y="114" fontSize="12">z</text>
        <text className="still-watching-z still-watching-z-b" x="166" y="110" fontSize="16">z</text>
        <text className="still-watching-z still-watching-z-c" x="172" y="106" fontSize="20">Z</text>
      </g>

      {/* The cat has claimed the warm spot */}
      <path d="M276 116c16 4 14 16 0 14" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M276 116c16 4 14 16 0 14" stroke={SAND} strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="256" cy="116" rx="24" ry="12" fill={SAND} {...outline(3)} />
      <path d="M226 106l1-12 8 6M246 106l-1-12-8 6" fill={SAND} {...outline(2)} />
      <circle cx="236" cy="112" r="11" fill={SAND} {...outline(3)} />
      <path d="M229 112q3 3 6 0M238 112q3 3 6 0" {...outline(2)} fill="none" />
      <path d="M235 118l1.5 1.5 1.5-1.5" {...outline(2)} fill="none" />

      {/* Casualties on the floor */}
      <g transform="rotate(70 92 172)">
        <path d="M78 160h28l-4 26h-20z" fill={CREAM} {...outline(2)} />
        <path d="M86 160l1 26M96 160l-1 26" stroke={TERRACOTTA} strokeWidth="4" />
        <path d="M78 160h28l-4 26h-20z" fill="none" {...outline(2)} />
      </g>
      <g fill={CREAM} {...outline(2)}>
        <circle cx="66" cy="178" r="5" />
        <circle cx="52" cy="186" r="4.5" />
        <circle cx="80" cy="190" r="4" />
        <circle cx="36" cy="180" r="4" fill={BUTTER} />
      </g>
      <rect x="270" y="186" width="30" height="9" rx="4" fill={INK} transform="rotate(-6 285 190)" />
      <circle cx="294" cy="189" r="2" fill={TERRACOTTA} />
    </svg>
  );
}
