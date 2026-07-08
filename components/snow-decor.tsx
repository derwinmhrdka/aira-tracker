/** Subtle winter backdrop — snowflakes + faint snowmen. Non-interactive. */
export function SnowDecor() {
  const flakes = [
    { top: '10%', left: '12%', size: 13, delay: 0, duration: 26 },
    { top: '20%', left: '78%', size: 12, delay: 4, duration: 22 },
    { top: '35%', left: '42%', size: 13, delay: 2, duration: 28 },
    { top: '52%', left: '14%', size: 12, delay: 6, duration: 24 },
    { top: '68%', left: '68%', size: 14, delay: 3, duration: 27 },
    { top: '80%', left: '40%', size: 11, delay: 8, duration: 23 },
    { top: '24%', left: '90%', size: 12, delay: 5, duration: 25 },
    { top: '58%', left: '55%', size: 11, delay: 7, duration: 21 },
  ] as const

  return (
    <div className="snow-decor" aria-hidden="true">
      <div className="snow-decor-pattern" />
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
      <Snowman className="snowman snowman--br" />
    </div>
  )
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
      <path
        d="M12 2v20M4.5 4.5l15 15M19.5 4.5l-15 15M2 12h20M5.2 8.8l13.6 6.4M18.8 8.8L5.2 15.2M5.2 15.2l13.6-6.4M18.8 15.2L5.2 8.8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Snowman({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 80"
      fill="currentColor"
      className={className}
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
