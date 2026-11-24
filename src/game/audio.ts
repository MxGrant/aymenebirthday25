/**
 * AudioManager — fully synthesised WebAudio score and sound effects.
 *
 * No external audio files are required, which means the game has engine sound,
 * tyre screech, nitro, UI feedback and a generative soundtrack out of the box.
 * Everything is created only after a user gesture (browser autoplay rules).
 */

export type SfxName =
  | 'click'
  | 'hover'
  | 'confirm'
  | 'engineStart'
  | 'collision'
  | 'nitro'
  | 'pickup'
  | 'gate'
  | 'achievement'
  | 'levelComplete'
  | 'park'
  | 'door'
  | 'deny'

type Voice = 'master' | 'music' | 'sfx' | 'engine'

const CHORDS: number[][] = [
  [57, 60, 64, 67], // Am
  [53, 57, 60, 64], // F
  [48, 55, 60, 64], // C
  [55, 59, 62, 67], // G
]

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buses: Record<Voice, GainNode | null> = { master: null, music: null, sfx: null, engine: null }
  private levels: Record<Voice, number> = { master: 0.85, music: 0.45, sfx: 0.75, engine: 0.55 }
  private muted = false
  private noiseBuffer: AudioBuffer | null = null
  private engineNodes: { oscA: OscillatorNode; oscB: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; noise: AudioBufferSourceNode; noiseGain: GainNode } | null = null
  private tyreNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null
  private musicTimer: number | null = null
  private musicMode: 'menu' | 'drive' | 'station' | 'finale' | null = null
  private nextNoteTime = 0
  private step = 0
  initialized = false

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : this.levels.master
    this.master.connect(ctx.destination)
    for (const key of ['music', 'sfx', 'engine'] as Voice[]) {
      const g = ctx.createGain()
      g.gain.value = this.levels[key]
      g.connect(this.master)
      this.buses[key] = g
    }
    this.noiseBuffer = this.makeNoise(ctx, 2)
    this.buildEngine()
    this.buildTyres()
    this.initialized = true
    if (ctx.state === 'suspended') void ctx.resume()
  }

  private makeNoise(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2 + white * 0.25
    }
    return buf
  }

  setVolume(channel: Voice, value: number) {
    this.levels[channel] = Math.max(0, Math.min(1, value))
    if (channel === 'master') {
      if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.levels.master, this.ctx.currentTime, 0.05)
    } else {
      const bus = this.buses[channel]
      if (bus && this.ctx) bus.gain.setTargetAtTime(this.levels[channel], this.ctx.currentTime, 0.05)
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : this.levels.master, this.ctx.currentTime, 0.05)
  }

  private buildEngine() {
    const ctx = this.ctx
    const bus = this.buses.engine
    if (!ctx || !bus) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 700
    filter.Q.value = 3
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    const oscA = ctx.createOscillator()
    oscA.type = 'sawtooth'
    oscA.frequency.value = 60
    const oscB = ctx.createOscillator()
    oscB.type = 'square'
    oscB.frequency.value = 30
    const mix = ctx.createGain()
    mix.gain.value = 0.5
    oscA.connect(mix)
    oscB.connect(mix)
    mix.connect(filter)
    filter.connect(gain)
    gain.connect(bus)

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0
    const noise = ctx.createBufferSource()
    if (this.noiseBuffer) {
      noise.buffer = this.noiseBuffer
      noise.loop = true
    }
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 220
    noiseFilter.Q.value = 0.7
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(bus)

    oscA.start()
    oscB.start()
    noise.start()
    this.engineNodes = { oscA, oscB, filter, gain, noise, noiseGain }
  }

  private buildTyres() {
    const ctx = this.ctx
    const bus = this.buses.sfx
    if (!ctx || !bus || !this.noiseBuffer) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1500
    filter.Q.value = 5
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    src.connect(filter)
    filter.connect(gain)
    gain.connect(bus)
    src.start()
    this.tyreNodes = { src, gain }
  }

  updateEngine(opts: { rpm: number; throttle: number; speed: number; boosting: boolean; offRoad: boolean; active: boolean }) {
    const ctx = this.ctx
    const nodes = this.engineNodes
    if (!ctx || !nodes) return
    const t = ctx.currentTime
    const rpm = Math.max(0, Math.min(1, opts.rpm))
    const base = 42 + rpm * 165 + Math.min(70, opts.speed * 1.4)
    nodes.oscA.frequency.setTargetAtTime(base, t, 0.06)
    nodes.oscB.frequency.setTargetAtTime(base * 0.5, t, 0.06)
    nodes.filter.frequency.setTargetAtTime(420 + rpm * 1500, t, 0.08)
    const target = opts.active ? 0.12 + opts.throttle * 0.16 + (opts.boosting ? 0.07 : 0) : 0.0001
    nodes.gain.gain.setTargetAtTime(target, t, 0.09)
    nodes.noiseGain.gain.setTargetAtTime(opts.active ? (opts.offRoad ? 0.09 : 0.02) : 0.0001, t, 0.12)
  }

  updateTyres(amount: number) {
    if (!this.ctx || !this.tyreNodes) return
    const t = this.ctx.currentTime
    this.tyreNodes.gain.gain.setTargetAtTime(Math.min(0.13, amount * 0.14), t, 0.06)
  }

  private blip(freq: number, duration: number, type: OscillatorType, volume: number, slideTo?: number, when?: number) {
    const ctx = this.ctx
    const bus = this.buses.sfx
    if (!ctx || !bus) return
    const t = (when ?? ctx.currentTime)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain)
    gain.connect(bus)
    osc.start(t)
    osc.stop(t + duration + 0.05)
  }

  private noiseBurst(duration: number, freq: number, volume: number, q = 1) {
    const ctx = this.ctx
    const bus = this.buses.sfx
    if (!ctx || !bus || !this.noiseBuffer) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(bus)
    src.start(t)
    src.stop(t + duration + 0.05)
  }

  play(name: SfxName) {
    if (!this.ctx) return
    switch (name) {
      case 'click':
        this.blip(520, 0.07, 'triangle', 0.09, 380)
        break
      case 'hover':
        this.blip(760, 0.05, 'sine', 0.035)
        break
      case 'confirm':
        this.blip(440, 0.1, 'triangle', 0.1, 660)
        this.blip(660, 0.14, 'triangle', 0.07, 880)
        break
      case 'deny':
        this.blip(180, 0.16, 'square', 0.08, 110)
        break
      case 'engineStart':
        this.noiseBurst(0.5, 900, 0.05, 0.8)
        this.blip(48, 1.1, 'sawtooth', 0.16, 120)
        this.blip(90, 0.9, 'square', 0.06, 60)
        break
      case 'collision':
        this.noiseBurst(0.35, 180, 0.22, 0.7)
        this.blip(90, 0.3, 'square', 0.12, 40)
        break
      case 'nitro':
        this.noiseBurst(0.9, 1400, 0.1, 0.6)
        this.blip(220, 0.7, 'sawtooth', 0.06, 900)
        break
      case 'pickup':
        this.blip(880, 0.09, 'sine', 0.08)
        this.blip(1320, 0.12, 'sine', 0.06, 1500)
        break
      case 'gate':
        this.blip(520, 0.12, 'sine', 0.09, 780)
        break
      case 'achievement':
        this.blip(523, 0.16, 'triangle', 0.09)
        this.blip(659, 0.16, 'triangle', 0.08)
        this.blip(784, 0.26, 'triangle', 0.08)
        break
      case 'levelComplete':
        this.blip(523, 0.2, 'sine', 0.09)
        this.blip(659, 0.2, 'sine', 0.08)
        this.blip(784, 0.2, 'sine', 0.08)
        this.blip(1046, 0.5, 'sine', 0.09)
        break
      case 'park':
        this.blip(320, 0.2, 'sine', 0.08, 240)
        this.noiseBurst(0.4, 400, 0.04, 2)
        break
      case 'door':
        this.noiseBurst(0.6, 300, 0.06, 1.5)
        this.blip(120, 0.5, 'sine', 0.05, 80)
        break
    }
  }

  startEngineSound() {
    this.init()
    if (this.engineNodes && this.ctx) {
      this.engineNodes.gain.gain.setTargetAtTime(0.14, this.ctx.currentTime, 0.2)
    }
  }

  stopEngineSound() {
    if (this.engineNodes && this.ctx) {
      this.engineNodes.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2)
      this.engineNodes.noiseGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2)
    }
  }

  startMusic(mode: 'menu' | 'drive' | 'station' | 'finale') {
    this.init()
    if (!this.ctx) return
    if (this.musicMode === mode) return
    this.musicMode = mode
    this.step = 0
    this.nextNoteTime = this.ctx.currentTime + 0.15
    if (this.musicTimer !== null) return
    this.musicTimer = window.setInterval(() => this.scheduler(), 120)
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
    this.musicMode = null
  }

  private scheduler() {
    const ctx = this.ctx
    const bus = this.buses.music
    if (!ctx || !bus || !this.musicMode) return
    const bpm = this.musicMode === 'drive' ? 104 : this.musicMode === 'finale' ? 112 : 84
    const stepDur = 60 / bpm / 2
    while (this.nextNoteTime < ctx.currentTime + 0.35) {
      const chord = CHORDS[Math.floor(this.step / 8) % CHORDS.length]
      const inBar = this.step % 8
      const isDrive = this.musicMode === 'drive' || this.musicMode === 'finale'
      const isFinale = this.musicMode === 'finale'

      // Pad — long, warm
      if (inBar === 0) {
        for (const note of chord) {
          this.pad(midiToHz(note), this.nextNoteTime, stepDur * 8, 0.028, bus)
        }
      }
      // Arpeggio
      if (isDrive) {
        const note = chord[(this.step * 3) % chord.length] + 12
        this.pluck(midiToHz(note), this.nextNoteTime, 0.24, isFinale ? 0.05 : 0.03, bus)
      }
      // Bass pulse
      if (inBar === 0 || inBar === 3 || inBar === 6) {
        this.pluck(midiToHz(chord[0] - 24), this.nextNoteTime, 0.34, 0.07, bus, 'sawtooth')
      }
      // Light percussion
      if (isDrive && (inBar === 2 || inBar === 6)) {
        this.kick(this.nextNoteTime, bus)
      }
      if (inBar % 2 === 1 && isDrive) {
        this.hat(this.nextNoteTime, bus)
      }

      this.nextNoteTime += stepDur
      this.step += 1
    }
  }

  private pad(freq: number, time: number, dur: number, vol: number, bus: GainNode) {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc2.type = 'sine'
    osc.frequency.value = freq
    osc2.frequency.value = freq * 2.002
    filter.type = 'lowpass'
    filter.frequency.value = 1500
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(vol, time + dur * 0.35)
    gain.gain.linearRampToValueAtTime(0.0001, time + dur)
    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(bus)
    osc.start(time)
    osc2.start(time)
    osc.stop(time + dur + 0.05)
    osc2.stop(time + dur + 0.05)
  }

  private pluck(freq: number, time: number, dur: number, vol: number, bus: GainNode, type: OscillatorType = 'triangle') {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    osc.type = type
    osc.frequency.value = freq
    filter.type = 'lowpass'
    filter.frequency.value = 3200
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(bus)
    osc.start(time)
    osc.stop(time + dur + 0.02)
  }

  private kick(time: number, bus: GainNode) {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, time)
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.16)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(0.11, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22)
    osc.connect(gain)
    gain.connect(bus)
    osc.start(time)
    osc.stop(time + 0.25)
  }

  private hat(time: number, bus: GainNode) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 7000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.03, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(bus)
    src.start(time)
    src.stop(time + 0.08)
  }
}

export const audio = new AudioManager()
