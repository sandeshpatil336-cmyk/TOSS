import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { coinSoundEngine } from './audio/coinSoundEngine';
import { RupeeCoin3D } from './components/RupeeCoin3D';

type CoinSide = 'HEAD' | 'TAIL';
type TossPhase = 'IDLE' | 'HOLDING' | 'AIRBORNE';

const PITCH_IMAGE_SRC = '/src/assets/images/cricket_pitch_arena_1795360379353.jpg';

function getFairCoinOutcome(): CoinSide {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % 2 === 0 ? 'HEAD' : 'TAIL';
  }
  return Math.random() >= 0.5 ? 'HEAD' : 'TAIL';
}

export default function App() {
  const [phase, setPhase] = useState<TossPhase>('IDLE');
  const [coinY, setCoinY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [wobbleZ, setWobbleZ] = useState(0);
  const [power, setPower] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [impactCount, setImpactCount] = useState(0);
  const [backdropFailed, setBackdropFailed] = useState(false);

  // Refs for smooth 60fps physics loop without stale closures
  const phaseRef = useRef<TossPhase>('IDLE');
  const soundOnRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const lastChimeRef = useRef<number>(0);

  const physicsRef = useRef({
    y: 0,
    vy: 0,
    rotX: 0,
    rotSpeed: 0,
    wobble: 0,
    power: 0,
    launchPower: 0,
    bounces: 0,
    targetSide: 'HEAD' as CoinSide,
    targetAngle: 0,
    holdElapsed: 0,
  });

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  const finalizeToss = useCallback((outcome: CoinSide) => {
    setResult(outcome);
    setPower(0);
    phaseRef.current = 'IDLE';
    setPhase('IDLE');
  }, []);

  const runHoldLoop = useCallback((now: number) => {
    if (phaseRef.current !== 'HOLDING') return;

    const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
    lastFrameRef.current = now;

    const p = physicsRef.current;
    p.holdElapsed += dt;
    p.power = Math.min(100, p.power + dt * 86);

    // Smooth elevation up to 210px + subtle energetic hover tremor at max power
    const baseHeight = (p.power / 100) * 208;
    const maxHover = p.power >= 99 ? Math.sin(p.holdElapsed * 24) * 3.5 : 0;
    p.y = baseHeight + maxHover;

    // Spin speed intensifies with power
    p.rotSpeed = 900 + p.power * 7.5;
    p.rotX += p.rotSpeed * dt;
    p.wobble = Math.sin(p.holdElapsed * 15) * (4 + (p.power / 100) * 5);

    if (now - lastChimeRef.current >= 115) {
      lastChimeRef.current = now;
      coinSoundEngine.playFlipChime(soundOnRef.current, p.power / 100);
    }

    setPower(Math.round(p.power));
    setCoinY(p.y);
    setRotationX(p.rotX);
    setWobbleZ(p.wobble);

    rafRef.current = requestAnimationFrame(runHoldLoop);
  }, []);

  const runAirborneLoop = useCallback(
    (now: number) => {
      if (phaseRef.current !== 'AIRBORNE') return;

      const dt = Math.min(0.04, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const p = physicsRef.current;
      const gravity = 1650;

      p.vy -= gravity * dt;
      p.y += p.vy * dt;

      if (p.bounces < 2) {
        p.rotX += p.rotSpeed * dt;
        p.wobble *= Math.pow(0.25, dt);

        // Occasional mid-air chime while still high above the pitch
        if (p.y > 70 && now - lastChimeRef.current >= 145) {
          lastChimeRef.current = now;
          coinSoundEngine.playFlipChime(soundOnRef.current, Math.min(1, p.y / 240));
        }
      } else {
        // Final micro-bounce: smoothly align face flat onto the exact result angle
        const diff = p.targetAngle - p.rotX;
        p.rotX += diff * Math.min(1, dt * 16);
        p.wobble *= Math.pow(0.05, dt);
      }

      if (p.y <= 0) {
        p.y = 0;

        if (p.bounces === 0) {
          p.bounces = 1;
          p.vy = 250 + p.launchPower * 1.35;
          p.rotSpeed = 520;
          setImpactCount((c) => c + 1);
          coinSoundEngine.playLandTing(soundOnRef.current, 1.0);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([70, 35, 110]);
          }
        } else if (p.bounces === 1) {
          p.bounces = 2;
          p.vy = 135;

          // Pick nearest flat landing angle matching targetSide (0 mod 360 = HEAD, 180 mod 360 = TAIL)
          const desiredMod = p.targetSide === 'HEAD' ? 0 : 180;
          const baseCycle = Math.floor(p.rotX / 360) * 360;
          let candidate = baseCycle + desiredMod;
          if (candidate < p.rotX) candidate += 360;
          p.targetAngle = candidate;

          setImpactCount((c) => c + 1);
          coinSoundEngine.playLandTing(soundOnRef.current, 0.56);
        } else {
          // Coin settled cleanly on the pitch crease
          p.y = 0;
          p.vy = 0;
          p.wobble = 0;
          const finalAngle = p.targetSide === 'HEAD' ? 0 : 180;
          p.rotX = finalAngle;

          setCoinY(0);
          setRotationX(finalAngle);
          setWobbleZ(0);
          coinSoundEngine.playLandTing(soundOnRef.current, 0.24);
          stopLoop();
          finalizeToss(p.targetSide);
          return;
        }
      }

      setCoinY(p.y);
      setRotationX(p.rotX);
      setWobbleZ(p.wobble);

      rafRef.current = requestAnimationFrame(runAirborneLoop);
    },
    [finalizeToss, stopLoop],
  );

  const handlePressStart = useCallback(() => {
    if (phaseRef.current !== 'IDLE') return;

    coinSoundEngine.unlock();
    coinSoundEngine.playWhoosh(soundOnRef.current);

    stopLoop();
    phaseRef.current = 'HOLDING';
    setPhase('HOLDING');
    setResult(null);
    setPower(0);

    const p = physicsRef.current;
    p.y = 6;
    p.vy = 0;
    p.power = 4;
    p.bounces = 0;
    p.holdElapsed = 0;
    p.rotSpeed = 950;

    const now = performance.now();
    lastFrameRef.current = now;
    lastChimeRef.current = now;
    rafRef.current = requestAnimationFrame(runHoldLoop);
  }, [runHoldLoop, stopLoop]);

  const handlePressEnd = useCallback(() => {
    if (phaseRef.current !== 'HOLDING') return;

    stopLoop();
    phaseRef.current = 'AIRBORNE';
    setPhase('AIRBORNE');

    const p = physicsRef.current;
    p.launchPower = Math.max(20, Math.round(p.power));
    p.targetSide = getFairCoinOutcome();
    p.bounces = 0;

    // Even a quick tap gives an authentic upward cricket toss arc
    p.vy = p.y < 140 ? 480 + (140 - p.y) * 1.4 : 210 + (p.power / 100) * 130;
    p.rotSpeed = 1280 + p.launchPower * 5;

    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runAirborneLoop);
  }, [runAirborneLoop, stopLoop]);

  // Keyboard support: Hold & release Spacebar to toss
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handlePressStart();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handlePressEnd();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handlePressStart, handlePressEnd]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      coinSoundEngine.unlock();
      coinSoundEngine.playSelectTick(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#081711] text-slate-50 flex flex-col select-none">
      {/* Clean 3-Zone Top Bar */}
      <header className="w-full border-b border-white/10 bg-[#081711]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <span className="font-display text-2xl sm:text-[26px] font-extrabold tracking-wider text-white whitespace-nowrap shrink-0">
            TOSS
          </span>

          {/* Zone 2: Quiet Unboxed Context Metadata */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-emerald-200/75 whitespace-nowrap shrink-0">
            <span>Cricket Ground Toss</span>
            <span aria-hidden="true">·</span>
            <span>₹1 Indian Coin</span>
            <span aria-hidden="true">·</span>
            <span>Web Audio Physics</span>
          </div>

          {/* Zone 3: Single Functional Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-pressed={soundOn}
            className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              soundOn
                ? 'bg-emerald-900/70 border-emerald-400/30 text-emerald-50 hover:bg-emerald-800/80'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{soundOn ? 'Sound ON' : 'Sound OFF'}</span>
          </button>
        </div>
      </header>

      {/* Main Focused Cricket Pitch Toss Arena */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex flex-col justify-center">
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Pitch Stage Viewport */}
          <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-b from-[#0E3524] via-[#134E31] to-[#1D3E25] shadow-2xl">
              {/* Generated Stadium Pitch Backdrop with zero-broken-image fallback */}
              {!backdropFailed && (
                <img
                  src={PITCH_IMAGE_SRC}
                  alt="Indian cricket stadium pitch and popping crease at golden hour"
                  referrerPolicy="no-referrer"
                  onError={() => setBackdropFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover object-bottom opacity-80"
                />
              )}

              {/* Measured Atmospheric Scrim for crisp coin & HUD legibility */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-[#06130E]/75 via-[#071A12]/25 to-[#06130E]/85"
                aria-hidden="true"
              />

              {/* Subtle Top Stage Readout (Unboxed metadata + live power gauge while holding) */}
              <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium text-emerald-100/85">
                  <span>Centre Pitch · 22 Yards</span>
                  <span className="font-mono tabular-nums text-amber-300">
                    {phase === 'HOLDING'
                      ? `POWER ${power}%`
                      : phase === 'AIRBORNE'
                        ? 'IN FLIGHT'
                        : 'READY'}
                  </span>
                </div>

                {/* Power Charge Bar (visible cleanly during hold) */}
                <div
                  className={`h-2 w-full rounded-full bg-black/50 overflow-hidden border border-white/15 transition-opacity duration-150 ${
                    phase === 'HOLDING' ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200 transition-none"
                    style={{ width: `${power}%` }}
                  />
                </div>
              </div>

              {/* Subtle White Popping Crease Guide Reinforcement */}
              <div
                className="absolute bottom-[28px] inset-x-0 h-[3px] bg-white/40 blur-[0.4px] pointer-events-none"
                aria-hidden="true"
              />

              {/* 3D ₹1 Indian Coin */}
              <div className="relative z-10 w-full h-full">
                <RupeeCoin3D
                  coinY={coinY}
                  rotationX={rotationX}
                  wobbleZ={wobbleZ}
                  isAirborne={phase !== 'IDLE'}
                  impactCount={impactCount}
                />
              </div>
            </div>

            {/* Result Strip (Zero-layout-shift fixed minimum height) */}
            <div className="min-h-[92px] rounded-2xl bg-[#0D231A] border border-white/10 px-5 py-4 flex items-center justify-center text-center">
              {result ? (
                <div className="font-display text-4xl font-extrabold tracking-wide text-amber-300 leading-none">
                  {result}!
                </div>
              ) : (
                <div>
                  <div className="font-display text-xl font-bold tracking-wide text-white">
                    {phase === 'HOLDING'
                      ? `Upar ja raha hai · ${power}%`
                      : phase === 'AIRBORNE'
                        ? 'Hawa me hai... CHHAN CHHAN'
                        : 'Toss karne ke liye dabake rakho / Press'}
                  </div>
                  <p className="text-xs text-emerald-200/70 mt-0.5">
                    {phase === 'HOLDING'
                      ? 'Button chhodo — sikka pitch par girega aur TING bajega.'
                      : phase === 'AIRBORNE'
                        ? 'Sikka ghum kar crease par girne wala hai...'
                        : 'Power charge karne ke liye button hold karo aur phir chhodo.'}
                  </p>
                </div>
              )}
            </div>

            {/* Primary Hold-to-Toss Action (Ergonomic Thumb Zone) */}
            <div className="flex flex-col">
              {/* Primary Hold-to-Toss Button (Pointer Events prevent double-fire on mobile touch) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  handlePressStart();
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  handlePressEnd();
                }}
                onPointerCancel={handlePressEnd}
                onContextMenu={(e) => e.preventDefault()}
                disabled={phase === 'AIRBORNE'}
                className={`w-full min-h-[64px] py-4 px-5 rounded-2xl font-display text-xl sm:text-[25px] font-extrabold tracking-wider transition-transform duration-150 touch-none select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                  phase === 'HOLDING'
                    ? 'bg-amber-300 text-slate-950 scale-[0.98] shadow-[0_0_32px_rgba(251,191,36,0.4)]'
                    : phase === 'AIRBORNE'
                      ? 'bg-amber-500/50 text-slate-950/75 cursor-wait'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_10px_28px_rgba(245,158,11,0.28)] active:scale-[0.98]'
                }`}
              >
                {phase === 'HOLDING'
                  ? `UPAR JA RAHA HAI (${power}%) — CHHODO!`
                  : phase === 'AIRBORNE'
                    ? 'SIKKA HAWA ME HAI...'
                    : 'TOSS KARNE KE LIYE DABAKE RAKHO / PRESS'}
              </button>
            </div>

            <p className="text-xs text-emerald-200/60 text-center">
              Sound ke sath asli ₹1 sikke jaisa feel ayega · Phone ka volume ON rakho
            </p>
        </div>
      </main>
    </div>
  );
}
