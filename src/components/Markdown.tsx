import React from 'react'

// Renderizador de markdown leve compartilhado (Genie): negrito, itálico,
// títulos e listas viram texto rico — nunca asteriscos/cerquilhas cruas.
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.substring(0, boldMatch.index)}</span>)
      }
      parts.push(
        <strong key={key++} className="font-semibold text-zinc-900">
          {boldMatch[1]}
        </strong>,
      )
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length)
      continue
    }

    const italicMatch = remaining.match(/\*([^*]+)\*/)
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.substring(0, italicMatch.index)}</span>)
      }
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>,
      )
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length)
      continue
    }

    parts.push(<span key={key++}>{remaining}</span>)
    break
  }

  return <>{parts}</>
}

export function Markdown({ text }: { text: string }) {
  const lines = (text || '').split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = `line-${i}`

    if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />)
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <div key={key} className="font-semibold text-[13px] text-zinc-900 mt-2 mb-1">
          {renderInline(line.slice(4))}
        </div>,
      )
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <div key={key} className="font-semibold text-[13px] text-zinc-900 mt-2 mb-1">
          {renderInline(line.slice(3))}
        </div>,
      )
      continue
    }
    if (line.startsWith('# ')) {
      elements.push(
        <div key={key} className="font-bold text-[14px] text-zinc-900 mt-2 mb-1">
          {renderInline(line.slice(2))}
        </div>,
      )
      continue
    }

    const numMatch = line.match(/^(\d+)[.)]\s+(.*)/)
    if (numMatch) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5">
          <span className="text-brand font-medium text-[13px] shrink-0 w-5">{numMatch[1]}.</span>
          <span className="text-[13px] text-zinc-700 leading-relaxed flex-1">
            {renderInline(numMatch[2])}
          </span>
        </div>,
      )
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)/)
    if (bulletMatch) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5">
          <span className="text-brand text-[13px] shrink-0">•</span>
          <span className="text-[13px] text-zinc-700 leading-relaxed flex-1">
            {renderInline(bulletMatch[1])}
          </span>
        </div>,
      )
      continue
    }

    elements.push(
      <div key={key} className="text-[13px] text-zinc-700 leading-relaxed">
        {renderInline(line)}
      </div>,
    )
  }

  return <>{elements}</>
}
