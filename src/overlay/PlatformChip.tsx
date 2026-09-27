import type { CSSProperties } from "react";
import { PLATFORM_COLOR } from "../shared/platformColors";
import { PLATFORMS } from "../shared/platforms";
import type { Platform } from "../shared/types";
import { PlatformMark } from "./PlatformMark";

export function PlatformChip({
  platform,
  label,
  compact = false,
}: {
  platform: Platform;
  label?: string;
  compact?: boolean;
}) {
  const name = label ?? PLATFORMS.find((p) => p.id === platform)?.label ?? platform;
  const color = PLATFORM_COLOR[platform];
  return (
    <span
      className={`platform-chip${compact ? " is-compact" : ""}`}
      style={{ "--platform-accent": color } as CSSProperties}
    >
      <span className="platform-chip-icon">
        <PlatformMark platform={platform} size={compact ? 14 : 16} />
      </span>
      <span className="platform-chip-label">{name}</span>
    </span>
  );
}

export function PlatformLogoRow({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`platform-row${compact ? " is-compact" : ""}`} aria-label="Supported streaming sites">
      {PLATFORMS.map((platform) => (
        <PlatformChip key={platform.id} platform={platform.id} compact={compact} />
      ))}
    </div>
  );
}
