/** Subtle winter backdrop — snowflakes + faint snowmen. Non-interactive. */
export function SnowDecor() {
  const flakes = [
    { top: '6%', left: '8%', size: 14, delay: 0, duration: 22 },
    { top: '14%', left: '72%', size: 10, delay: 4, duration: 18 },
    { top: '22%', left: '38%', size: 12, delay: 2, duration: 25 },
    { top: '35%', left: '88%', size: 9, delay: 7, duration: 20 },
    { top: '48%', left: '12%', size: 11, delay: 1, duration: 28 },
    { top: '55%', left: '58%', size: 13, delay: 5, duration: 24 },
    { top: '68%', left: '28%', size: 10, delay: 3, duration: 19 },
    { top: '72%', left: '82%', size: 15, delay: 8, duration: 26 },
    { top: '82%', left: '48%', size: 9, delay: 6, duration: 21 },
    { top: '10%', left: '52%', size: 8, delay: 9, duration: 30 },
    { top: '42%', left: '92%', size: 11, delay: 2, duration: 23 },
    { top: '88%', left: '6%', size: 12, delay: 4, duration: 27 },
  ] as const

  return (
    <div
      className="snow-decor"
      aria-hidden="true"
    >
      <div className="snow-decor-gradient" />

      {flakes.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            top: f.top,
            left: f.left,
            width: f.size,
            height: f.size,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
          }}
        >
          <SnowflakeIcon />
        </span>
      ))}

      <Snowman className="snowman snowman--tl" />
      <Snowman className="snowman snowman--br" scale={0.85} />
    </div>
  )
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
      <path
        d="M12 2v20M4.5 4.5l15 15M19.5 4.5l-15 15M2 12h20M5.2 8.8l13.6 6.4M18.8 8.8L5.2 15.2M5.2 15.2l13.6-6.4M18.8 15.2L5.2 8.8"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Snowman({
  className,
  scale = 1,
}: {
  className?: string
  scale?: number
}) {
  return (
    <svg
      viewBox="0 0 64 80"
      fill="currentColor"
      className={className}
      style={{ transform: `scale(${scale})` }}
    >
      {/* hat */}
      <rect x="18" y="4" width="28" height="6" rx="1" opacity="0.9" />
      <rect x="22" y="10" width="20" height="14" rx="2" opacity="0.85" />
      {/* head */}
      <circle cx="32" cy="32" r="11" opacity="0.75" />
      {/* body */}
      <circle cx="32" cy="52" r="14" opacity="0.7" />
      {/* base */}
      <circle cx="32" cy="70" r="10" opacity="0.65" />
      {/* arms */}
      <path
        d="M18 50 L8 44 M46 50 L56 44"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* nose */}
      <circle cx="32" cy="33" r="1.5" opacity="0.5" />
    </svg>
  )
}
