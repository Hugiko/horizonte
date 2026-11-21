import katex from 'katex'
import { memo, useMemo } from 'react'

/**
 * Texto con fórmulas: $...$ en línea, $$...$$ en bloque, **negrita**, saltos de párrafo con línea en blanco
 * y listas con "- ".
 */
function render(src: string): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (t: string) => {
    const parts = t.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g)
    return parts.map((p) => {
      if (p.startsWith('$$')) return katex.renderToString(p.slice(2, -2), { displayMode: true, throwOnError: false })
      if (p.startsWith('$') && p.length > 1) return katex.renderToString(p.slice(1, -1), { throwOnError: false })
      return esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    }).join('')
  }
  return src.trim().split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n')
    if (lines.every((l) => /^\s*- /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*- /, ''))}</li>`).join('')}</ul>`
    if (/^#{1,3} /.test(block)) return `<h4>${inline(block.replace(/^#{1,3} /, ''))}</h4>`
    return `<p>${inline(lines.join(' '))}</p>`
  }).join('')
}

export const Tex = memo(function Tex({ children, className }: { children: string; className?: string }) {
  const html = useMemo(() => render(children), [children])
  return <div className={`tex ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
})

export const TexInline = memo(function TexInline({ children }: { children: string }) {
  const html = useMemo(() => katex.renderToString(children, { throwOnError: false }), [children])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
})
