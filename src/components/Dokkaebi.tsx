import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  swinging?: boolean;
  className?: string;
  tone?: DokkaebiTone;
};

export type DokkaebiTone =
  | "mint" | "pink" | "sky" | "lemon" | "lilac" | "peach" | "sage" | "coral"
  | "rose" | "aqua" | "violet" | "amber" | "teal" | "indigo" | "magenta" | "olive";

const TONES: Record<DokkaebiTone, { body: string; belly: string; horn: string }> = {
  mint:   { body: "oklch(0.88 0.11 165)", belly: "oklch(0.96 0.04 165)", horn: "oklch(0.55 0.09 170)" },
  pink:   { body: "oklch(0.86 0.10 20)",  belly: "oklch(0.96 0.04 20)",  horn: "oklch(0.55 0.10 25)" },
  sky:    { body: "oklch(0.86 0.09 235)", belly: "oklch(0.96 0.03 235)", horn: "oklch(0.55 0.10 240)" },
  lemon:  { body: "oklch(0.91 0.13 95)",  belly: "oklch(0.97 0.05 95)",  horn: "oklch(0.6 0.12 80)"  },
  lilac:  { body: "oklch(0.85 0.09 305)", belly: "oklch(0.96 0.03 305)", horn: "oklch(0.55 0.11 305)" },
  peach:  { body: "oklch(0.87 0.10 50)",  belly: "oklch(0.96 0.04 50)",  horn: "oklch(0.58 0.11 50)"  },
  sage:   { body: "oklch(0.86 0.07 145)", belly: "oklch(0.96 0.03 145)", horn: "oklch(0.5 0.08 150)"  },
  coral:  { body: "oklch(0.82 0.13 35)",  belly: "oklch(0.95 0.05 35)",  horn: "oklch(0.55 0.13 30)"  },
  rose:    { body: "oklch(0.82 0.12 0)",   belly: "oklch(0.95 0.05 0)",   horn: "oklch(0.5 0.13 5)"    },
  aqua:    { body: "oklch(0.86 0.10 195)", belly: "oklch(0.96 0.04 195)", horn: "oklch(0.52 0.10 200)" },
  violet:  { body: "oklch(0.78 0.13 285)", belly: "oklch(0.94 0.05 285)", horn: "oklch(0.48 0.14 285)" },
  amber:   { body: "oklch(0.84 0.13 70)",  belly: "oklch(0.96 0.05 70)",  horn: "oklch(0.55 0.13 65)"  },
  teal:    { body: "oklch(0.78 0.10 185)", belly: "oklch(0.94 0.04 185)", horn: "oklch(0.45 0.09 185)" },
  indigo:  { body: "oklch(0.74 0.11 265)", belly: "oklch(0.93 0.04 265)", horn: "oklch(0.42 0.13 265)" },
  magenta: { body: "oklch(0.78 0.15 330)", belly: "oklch(0.94 0.06 330)", horn: "oklch(0.48 0.16 330)" },
  olive:   { body: "oklch(0.82 0.09 110)", belly: "oklch(0.95 0.04 110)", horn: "oklch(0.48 0.09 110)" },
};

export const DOKKAEBI_TONES = Object.keys(TONES) as DokkaebiTone[];

export function toneFromKey(key: string): DokkaebiTone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return DOKKAEBI_TONES[h % DOKKAEBI_TONES.length];
}

/** Assign a distinct tone by stable index so adjacent cards never repeat. */
export function toneByIndex(index: number): DokkaebiTone {
  return DOKKAEBI_TONES[((index % DOKKAEBI_TONES.length) + DOKKAEBI_TONES.length) % DOKKAEBI_TONES.length];
}

/** Cute baby dokkaebi (goblin) with horns and a wand. */
export function Dokkaebi({ size = 140, swinging = false, className, tone = "mint" }: Props) {
  const t = TONES[tone];
  return (
    <div
      className={cn("relative inline-block", !swinging && "animate-dokkaebi", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        {/* shadow */}
        <ellipse cx="100" cy="186" rx="48" ry="6" fill="oklch(0.45 0.09 175 / 0.15)" />
        {/* horns */}
        <path d="M62 56 Q56 32 74 36 Q76 48 78 58 Z" fill={t.horn} />
        <path d="M138 56 Q144 32 126 36 Q124 48 122 58 Z" fill={t.horn} />
        {/* body */}
        <ellipse cx="100" cy="110" rx="62" ry="60" fill={t.body} />
        {/* belly */}
        <ellipse cx="100" cy="128" rx="36" ry="30" fill={t.belly} />
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