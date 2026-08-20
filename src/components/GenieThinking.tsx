import { useState, useEffect } from 'react'

// Estado "pensando" do Genie: frases que se alternam com um brilho passando
// pelo texto (shimmer). Substitui o skeleton cinza por algo com vida.
const lines = [
  'Já estou trazendo os principais insights...',
  'Cruzando campanhas, e-mails e agenda...',
  'Separando o que merece sua atenção...',
  'Montando seu resumo...',
]

export function GenieThinking() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), 2400)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-[2.75rem] flex items-center py-0.5">
      <span key={i} className="genie-thinking text-[13px] font-medium">
        {lines[i]}
      </span>
    </div>
  )
}
