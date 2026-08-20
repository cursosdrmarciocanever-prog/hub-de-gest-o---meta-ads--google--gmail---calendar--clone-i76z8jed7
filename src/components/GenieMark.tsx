interface GenieMarkProps {
  size?: number
  animated?: boolean
  className?: string
}

// Símbolo do Genie: estrela central + dois anéis orbitando (ref. arte orbital).
// Traço fino, currentColor (herda a cor do contexto). Animação em CSS (main.css).
export function GenieMark({ size = 24, animated = true, className = '' }: GenieMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`genie-mark ${animated ? 'genie-mark--animated' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      {/* brilho central */}
      <circle cx="12" cy="12" r="4.6" fill="currentColor" opacity="0.1" />

      {/* órbita A */}
      <g className="genie-orbit genie-orbit--a">
        <g transform="rotate(32 12 12)">
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="3.6"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle cx="22" cy="12" r="1.15" fill="currentColor" />
        </g>
      </g>

      {/* órbita B */}
      <g className="genie-orbit genie-orbit--b">
        <g transform="rotate(-32 12 12)">
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="3.6"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle cx="2" cy="12" r="1.15" fill="currentColor" />
        </g>
      </g>

      {/* estrela central de 4 pontas */}
      <path
        className="genie-star"
        d="M12 4.5c.42 5 .98 5.5 6.5 7.5-5.52 2-6.08 2.5-6.5 7.5-.42-5-.98-5.5-6.5-7.5 5.52-2 6.08-2.5 6.5-7.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
