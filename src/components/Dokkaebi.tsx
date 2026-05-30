import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  swinging?: boolean;
  className?: string;
};

/** Cute baby dokkaebi (goblin) with horns and a wand. */
export function Dokkaebi({ size = 140, swinging = false, className }: Props) {
  return (
    <div
      className={cn("relative inline-block", !swinging && "animate-dokkaebi", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        {/* shadow */}
        <ellipse cx="100" cy="186" rx="48" ry="6" fill="oklch(0.45 0.09 175 / 0.15)" />
        {/* horns */}
        <path d="M62 56 Q56 32 74 36 Q76 48 78 58 Z" fill="oklch(0.55 0.09 170)" />
        <path d="M138 56 Q144 32 126 36 Q124 48 122 58 Z" fill="oklch(0.55 0.09 170)" />
        {/* body */}
        <ellipse cx="100" cy="110" rx="62" ry="60" fill="oklch(0.88 0.11 165)" />
        {/* belly */}
        <ellipse cx="100" cy="128" rx="36" ry="30" fill="oklch(0.96 0.04 165)" />
        {/* cheeks */}
        <circle cx="62" cy="118" r="9" fill="oklch(0.85 0.1 25 / 0.55)" />
        <circle cx="138" cy="118" r="9" fill="oklch(0.85 0.1 25 / 0.55)" />
        {/* eyes */}
        <circle cx="80" cy="102" r="6" fill="oklch(0.2 0.04 180)" />
        <circle cx="120" cy="102" r="6" fill="oklch(0.2 0.04 180)" />
        <circle cx="82" cy="100" r="2" fill="#fff" />
        <circle cx="122" cy="100" r="2" fill="#fff" />
        {/* smile */}
        <path d="M88 124 Q100 134 112 124" stroke="oklch(0.25 0.05 180)" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* arm + wand */}
        <g transform="translate(150 110)" className={swinging ? "animate-wand" : undefined} style={{ transformOrigin: "0 30px" }}>
          <rect x="-3" y="-4" width="6" height="44" rx="3" fill="oklch(0.45 0.08 60)" />
          <circle cx="0" cy="-10" r="12" fill="oklch(0.55 0.06 60)" />
          <circle cx="-3" cy="-13" r="3" fill="oklch(0.85 0.08 90)" />
        </g>
        {/* sparkles */}
        <g className="animate-sparkle" style={{ animationDelay: "0.2s" }}>
          <circle cx="40" cy="60" r="3" fill="oklch(0.85 0.15 90)" />
        </g>
        <g className="animate-sparkle" style={{ animationDelay: "0.7s" }}>
          <circle cx="172" cy="80" r="2.5" fill="oklch(0.85 0.15 90)" />
        </g>
        <g className="animate-sparkle" style={{ animationDelay: "1.1s" }}>
          <circle cx="30" cy="130" r="2" fill="oklch(0.85 0.15 90)" />
        </g>
      </svg>
    </div>
  );
}