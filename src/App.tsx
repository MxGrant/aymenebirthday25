import { useEffect } from 'react'
import { useGame } from './game/store'
import { audio } from './game/audio'
import { MenuShell } from './ui/MainMenu'
import { IntroScreen } from './ui/IntroScreen'
import { DriveScreen } from './ui/DriveScreen'
import { StationScreen } from './ui/StationScreen'
import { CompleteScreen } from './ui/CompleteScreen'
import { FinaleScreen } from './ui/FinaleScreen'
import { Toasts } from './ui/Toasts'

export default function App() {
  const screen = useGame((s) => s.screen)
  const settings = useGame((s) => s.settings)

  // Dev-only hooks used by the automated playthrough checks.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__aymeneGame = useGame
    import('./dev/simulate').then((mod) => {
      w.__aymeneSim = mod
    })
    return () => {
      delete w.__aymeneGame
      delete w.__aymeneSim
    }
  }, [])

  useEffect(() => {
    const unlock = () => {
      audio.init()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    audio.setVolume('master', settings.master)
    audio.setVolume('music', settings.music)
    audio.setVolume('sfx', settings.sfx)
    audio.setVolume('engine', settings.engine)
    audio.setMuted(settings.muted)
  }, [settings])

  useEffect(() => {
    if (screen === 'menu' || screen === 'garage' || screen === 'levelselect' || screen === 'howto' || screen === 'settings') {
      audio.startMusic('menu')
    }
    if (screen === 'station') audio.startMusic('station')
    if (screen === 'drive') audio.startMusic('drive')
    if (screen === 'finale' || screen === 'intro') audio.startMusic('finale')
  }, [screen])

  const isMenu = screen === 'menu' || screen === 'garage' || screen === 'levelselect' || screen === 'howto' || screen === 'settings'

  return (
    <div className={`app app--${screen}`} data-reduced={settings.reducedMotion ? 'true' : 'false'}>
      {isMenu && <MenuShell />}
      {screen === 'intro' && <IntroScreen />}
      {screen === 'drive' && <DriveScreen />}
      {screen === 'station' && <StationScreen />}
      {screen === 'complete' && <CompleteScreen />}
      {screen === 'finale' && <FinaleScreen />}
      <Toasts />
    </div>
  )
}
