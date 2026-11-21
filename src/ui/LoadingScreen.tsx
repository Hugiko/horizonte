import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function LoadingScreen() {
  const { progress, active } = useProgress()
  const { t } = useTranslation()
  const tips = t('tips', { returnObjects: true }) as string[]
  const [tip, setTip] = useState(() => Math.floor(Math.random() * tips.length))
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTip((i) => (i + 1) % tips.length), 4000)
    return () => clearInterval(id)
  }, [tips.length])

  const done = !active && progress >= 100
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setHidden(true), 900)
    return () => clearTimeout(id)
  }, [done])

  if (hidden) return null
  return (
    <div className={`loading ${done ? 'done' : ''}`}>
      <h1>{t('title')}</h1>
      <div className="bar"><div style={{ width: `${progress}%` }} /></div>
      <div className="pct">{t('loading')} · {Math.round(progress)} %</div>
      <p className="tip" dangerouslySetInnerHTML={{ __html: tips[tip] }} />
    </div>
  )
}
