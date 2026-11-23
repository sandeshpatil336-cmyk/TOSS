import React from 'react';

interface RupeeCoin3DProps {
  /** Height in px above the pitch crease (0 = resting on crease) */
  coinY: number;
  /** End-over-end rotation in degrees (0 = HEAD, 180 = TAIL) */
  rotationX: number;
  /** Subtle yaw/tilt wobble in degrees for natural toss realism */
  wobbleZ: number;
  /** Whether coin is currently airborne */
  isAirborne: boolean;
  /** Incrementing key to trigger chalk-crease landing ripple */
  impactCount: number;
}

export const RupeeCoin3D: React.FC<RupeeCoin3DProps> = ({
  coinY,
  rotationX,
  wobbleZ,
  isAirborne,
  impactCount,
}) => {
  // Dynamic shadow scales down and softens as coin rises into the air
  const heightNorm = Math.min(1, Math.max(0, coinY / 260));
  const shadowScale = 1 - heightNorm * 0.56;
  const shadowOpacity = 0.62 - heightNorm * 0.42;

  // Dynamic specular reflection angle driven by flip rotation
  const glintShift = Math.sin((rotationX * Math.PI) / 180) * 55;
  const scaleBoost = 1 + heightNorm * 0.14;

  return (
    <div className="relative flex flex-col items-center justify-end h-full w-full pointer-events-none select-none">
      {/* Pitch landing chalk ripple on bounce impact */}
      {impactCount > 0 && (
        <div
          key={impactCount}
          className="animate-pitch-ripple absolute bottom-[26px] left-1/2 w-[112px] h-[30px] rounded-full border-2 border-amber-300/75 shadow-[0_0_24px_rgba(251,191,36,0.45)]"
        />
      )}

      {/* Ground shadow anchored on the white popping crease */}
      <div
        className="absolute bottom-[20px] left-1/2 -translate-x-1/2 h-[18px] w-[116px] rounded-full bg-black/75 blur-[6px] transition-none"
        style={{
          transform: `translateX(-50%) scale(${shadowScale})`,
          opacity: shadowOpacity,
        }}
      />

      {/* 3D Coin Container */}
      <div
        className="coin-scene absolute bottom-[30px] left-1/2"
        style={{
          transform: `translate(-50%, ${-coinY}px) scale(${scaleBoost})`,
        }}
      >
        <div
          className="coin-body relative w-[124px] h-[124px] sm:w-[136px] sm:h-[136px]"
          style={{
            transform: `rotateZ(${wobbleZ}deg) rotateX(${rotationX}deg)`,
          }}
        >
          {/* Metallic Coin Edge Thickness Stack (gives realistic brass/gold rim depth mid-flip) */}
          {[-3, -2, -1, 1, 2, 3].map((zOffset) => (
            <div
              key={zOffset}
              className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-600 via-yellow-700 to-amber-900 border border-amber-500/40"
              style={{ transform: `translateZ(${zOffset}px)` }}
              aria-hidden="true"
            />
          ))}

          {/* FRONT FACE — HEAD (Sovereign Lion Emblem) */}
          <div
            className="coin-face absolute inset-0 rounded-full flex flex-col items-center justify-center overflow-hidden border-[5px] border-amber-600/95 shadow-[inset_0_2px_10px_rgba(255,255,255,0.65),inset_0_-6px_14px_rgba(120,53,15,0.65),0_12px_28px_rgba(0,0,0,0.55)]"
            style={{
              transform: 'translateZ(4px)',
              background:
                'radial-gradient(circle at 32% 28%, #fef08a 0%, #facc15 36%, #d97706 78%, #92400e 100%)',
            }}
          >
            {/* Milled Inner Bezel Ring */}
            <div className="absolute inset-[7px] rounded-full border border-dashed border-amber-900/45" />
            <div className="absolute inset-[11px] rounded-full border border-yellow-200/45" />

            {/* Dynamic Specular Sheen */}
            <div
              className="absolute -inset-6 pointer-events-none opacity-45"
              style={{
                background:
                  'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.85) 50%, transparent 65%)',
                transform: `translateY(${glintShift}%)`,
              }}
            />

            <span className="relative text-[9px] font-bold tracking-[0.22em] text-amber-950/85 uppercase leading-none mb-1">
              BHARAT · INDIA
            </span>

            {/* Stylized Ashoka Capital / Crown Emblem SVG */}
            <svg
              viewBox="0 0 64 52"
              className="relative w-12 h-10 sm:w-14 sm:h-11 text-amber-950 drop-shadow-[0_1px_0_rgba(254,240,138,0.75)]"
              fill="currentColor"
              aria-hidden="true"
            >
              {/* Stylized Lion Pillar Capital Silhouette */}
              <path d="M32 4c-3.2 0-5.8 2.2-6.4 5.2-.9-.3-1.9-.5-2.9-.5-3.9 0-7 3.1-7 7 0 2.1.9 4 2.4 5.3L16 29h32l-2.1-8c1.5-1.3 2.4-3.2 2.4-5.3 0-3.9-3.1-7-7-7-1 0-2 .2-2.9.5C37.8 6.2 35.2 4 32 4zm0 4.2a2.8 2.8 0 0 1 2.8 2.8v4.5h-5.6V11A2.8 2.8 0 0 1 32 8.2zM21.2 13a2.4 2.4 0 0 1 2.4 2.4v3.4h-4.8v-3.4A2.4 2.4 0 0 1 21.2 13zm21.6 0a2.4 2.4 0 0 1 2.4 2.4v3.4h-4.8v-3.4a2.4 2.4 0 0 1 2.4-2.4z" />
              {/* Abacus with Dharma Chakra Wheel */}
              <rect x="14" y="31" width="36" height="5.5" rx="2" />
              <circle cx="32" cy="33.75" r="2.1" fill="#facc15" />
              {/* Lotus Base */}
              <path d="M18 39h28l-4 7H22l-4-7z" />
            </svg>

            <span className="relative mt-0.5 font-display text-[17px] sm:text-[18px] font-extrabold tracking-[0.14em] text-amber-950 leading-none">
              HEAD
            </span>
          </div>

          {/* BACK FACE — TAIL (₹1 INDIA 2026) */}
          <div
            className="coin-face coin-face-back absolute inset-0 rounded-full flex flex-col items-center justify-center overflow-hidden border-[5px] border-amber-600/95 shadow-[inset_0_2px_10px_rgba(255,255,255,0.65),inset_0_-6px_14px_rgba(120,53,15,0.65),0_12px_28px_rgba(0,0,0,0.55)]"
            style={{
              transform: 'rotateX(180deg) translateZ(4px)',
              background:
                'radial-gradient(circle at 65% 28%, #fef08a 0%, #facc15 38%, #d97706 78%, #92400e 100%)',
            }}
          >
            {/* Milled Inner Bezel Ring */}
            <div className="absolute inset-[7px] rounded-full border border-dashed border-amber-900/45" />
            <div className="absolute inset-[11px] rounded-full border border-yellow-200/45" />

            {/* Subtle Grain Stalks Left & Right */}
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full text-amber-950/25 pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M28 84 C18 66, 20 44, 34 28" strokeLinecap="round" />
              <path d="M92 84 C102 66, 100 44, 86 28" strokeLinecap="round" />
            </svg>

            {/* Dynamic Specular Sheen */}
            <div
              className="absolute -inset-6 pointer-events-none opacity-45"
              style={{
                background:
                  'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.85) 50%, transparent 65%)',
                transform: `translateY(${-glintShift}%)`,
              }}
            />

            <span className="relative text-[9px] font-bold tracking-[0.22em] text-amber-950/85 uppercase leading-none">
              INDIA
            </span>
            <span className="relative font-display text-[46px] sm:text-[50px] font-extrabold text-amber-950 leading-[0.95] drop-shadow-[0_1px_0_rgba(254,240,138,0.8)] tabular-nums my-0.5">
              ₹1
            </span>
            <div className="relative flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-amber-950/90 leading-none">
              <span className="font-mono tabular-nums">2026</span>
              <span aria-hidden="true">·</span>
              <span>TAIL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle motion blur halo only while flipping fast */}
      {isAirborne && (
        <div
          className="absolute bottom-[30px] left-1/2 w-[132px] h-[132px] rounded-full bg-amber-300/15 blur-xl pointer-events-none"
          style={{
            transform: `translate(-50%, ${-coinY}px)`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
