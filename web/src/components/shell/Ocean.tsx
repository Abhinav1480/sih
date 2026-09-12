/**
 * The living background: three drifting gradient bodies and one slow wave
 * band. All animation is CSS on transform (see globals.css), so it composites
 * without repainting, and it stops entirely under prefers-reduced-motion.
 * It is purely decorative and hidden from assistive technology.
 */
export function Ocean() {
  return (
    <div className="ocean" aria-hidden="true">
      <i /><i /><i />
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 60 C 150 20, 300 100, 450 60 S 750 20, 900 60 S 1050 100, 1200 60 L1200 120 L0 120 Z"
          fill="var(--ocean-b)"
        />
        <path
          d="M0 80 C 200 50, 400 110, 600 80 S 1000 50, 1200 80 L1200 120 L0 120 Z"
          fill="var(--ocean-a)"
        />
      </svg>
    </div>
  );
}
