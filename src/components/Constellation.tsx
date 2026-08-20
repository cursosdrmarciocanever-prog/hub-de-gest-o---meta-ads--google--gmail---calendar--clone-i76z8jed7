import { Mail, CalendarDays } from 'lucide-react'

// Constelação do login, 100% em código — estrela central pulsando + anéis
// girando com os ícones das integrações orbitando. Dramática e preenchendo.

function MetaGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

const STARS = [
  { t: 6, l: 12, s: 2, o: 0.55 },
  { t: 14, l: 78, s: 1.5, o: 0.4 },
  { t: 20, l: 40, s: 1, o: 0.3 },
  { t: 28, l: 90, s: 2, o: 0.55 },
  { t: 33, l: 18, s: 1.5, o: 0.4 },
  { t: 42, l: 64, s: 1, o: 0.4 },
  { t: 50, l: 6, s: 2, o: 0.5 },
  { t: 56, l: 94, s: 1.5, o: 0.45 },
  { t: 62, l: 30, s: 1, o: 0.3 },
  { t: 68, l: 76, s: 2, o: 0.5 },
  { t: 76, l: 14, s: 1.5, o: 0.4 },
  { t: 82, l: 56, s: 1, o: 0.35 },
  { t: 88, l: 86, s: 2, o: 0.5 },
  { t: 10, l: 52, s: 1, o: 0.3 },
  { t: 46, l: 48, s: 1.5, o: 0.3 },
  { t: 24, l: 68, s: 1, o: 0.35 },
  { t: 72, l: 50, s: 1.5, o: 0.4 },
  { t: 38, l: 34, s: 1, o: 0.3 },
  { t: 92, l: 40, s: 1.5, o: 0.4 },
  { t: 18, l: 8, s: 1, o: 0.35 },
  { t: 60, l: 60, s: 1, o: 0.3 },
  { t: 86, l: 26, s: 1.5, o: 0.4 },
]

function Planet({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-12 h-12 rounded-full bg-[#f4efe3] flex items-center justify-center shadow-[0_0_28px_6px_rgba(120,160,230,0.4)] ring-1 ring-white/25">
      {children}
    </div>
  )
}

function Orbit({ d, dur, children }: { d: number; dur: number; children: React.ReactNode }) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{ width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2 }}
    >
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <div className="absolute inset-0 orbit-ring-anim" style={{ ['--dur' as string]: dur + 's' }}>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <div className="orbit-planet-anim" style={{ ['--dur' as string]: dur + 's' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Constellation() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* atmosfera — glow radial central */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 45%, rgba(70,120,210,0.20), rgba(11,30,45,0) 70%)',
        }}
      />

      {/* estrelas de fundo */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ top: `${s.t}%`, left: `${s.l}%`, width: s.s, height: s.s, opacity: s.o }}
        />
      ))}

      {/* núcleo — estrela pulsando + halo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-blue-300/15 blur-3xl" />
        <svg
          width="104"
          height="104"
          viewBox="0 0 24 24"
          className="relative text-[#f6f1e6]"
          style={{ animation: 'genie-pulse 3.4s ease-in-out infinite' }}
        >
          <path
            d="M12 1c.55 6.5 1.3 7.4 9 9.7-7.7 2.3-8.45 3.2-9 9.7-.55-6.5-1.3-7.4-9-9.7 7.7-2.3 8.45-3.2 9-9.7Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* anéis com os ícones das integrações */}
      <Orbit d={300} dur={26}>
        <Planet>
          <Mail size={20} className="text-[#EA4335]" />
        </Planet>
      </Orbit>
      <Orbit d={480} dur={40}>
        <Planet>
          <CalendarDays size={20} className="text-[#4285F4]" />
        </Planet>
      </Orbit>
      <Orbit d={660} dur={56}>
        <Planet>
          <MetaGlyph size={20} />
        </Planet>
      </Orbit>
    </div>
  )
}
