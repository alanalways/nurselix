/**
 * Nurslix brand icon — DNA double helix with integrated heart shape.
 * Uses currentColor for stroke, so it adapts to parent text color.
 */
interface Props {
  size?: number;
  className?: string;
}

export function NurslixIcon({ size = 20, className = "" }: Props) {
  const h = Math.round(size * 68 / 44);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 44 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left strand: starts upper-left, weaves right, opens into left heart lobe */}
      <path
        d="M 14 3
           C 14 11, 30 11, 30 19
           C 30 27, 14 27, 14 34
           C 3 41, 0 54, 22 65"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right strand: starts upper-right, weaves left, opens into right heart lobe */}
      <path
        d="M 30 3
           C 30 11, 14 11, 14 19
           C 14 27, 30 27, 30 34
           C 41 41, 44 54, 22 65"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* DNA rungs (short horizontal bridges at crossing points) */}
      <line x1="16" y1="7.5" x2="28" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <line x1="16" y1="23"  x2="28" y2="23"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

/** Square-contained version — pads the icon to fit neatly inside a square div. */
export function NurslixIconSquare({ size = 32, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-4 -2 52 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 14 3
           C 14 11, 30 11, 30 19
           C 30 27, 14 27, 14 34
           C 3 41, 0 54, 22 65"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 30 3
           C 30 11, 14 11, 14 19
           C 14 27, 30 27, 30 34
           C 41 41, 44 54, 22 65"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="16" y1="7.5" x2="28" y2="7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <line x1="16" y1="23"  x2="28" y2="23"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
