/**
 * Lightweight Web Audio API sound effects — no external files.
 * All synthesis is done in-browser with a singleton AudioContext.
 */

let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

/** Soft ascending "pop" — played when a node is created */
export function playCreate(): void {
  try {
    const ac = getCtx()
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sine'
    const t = ac.currentTime
    osc.frequency.setValueAtTime(260, t)
    osc.frequency.exponentialRampToValueAtTime(580, t + 0.10)
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.18)
    gain.gain.setValueAtTime(0.0, t)
    gain.gain.linearRampToValueAtTime(0.14, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    osc.start(t)
    osc.stop(t + 0.28)
  } catch (_) { /* AudioContext blocked in some environments */ }
}

/**
 * "Fwoop" collapse sound — a bandpass-swept noise that quickly sweeps from
 * high to low frequency, like things being gathered/folded inward.
 * Distinctly different from the delete whoosh (pure sine) in character.
 */
export function playShush(): void {
  try {
    const ac = getCtx()
    const duration = 0.18
    const sr = ac.sampleRate
    const buffer = ac.createBuffer(1, Math.ceil(sr * duration), sr)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    const source = ac.createBufferSource()
    source.buffer = buffer

    // Bandpass sweeps rapidly downward — "fwoop" inward-gathering feel
    const bandpass = ac.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.Q.value = 1.8
    const t = ac.currentTime
    bandpass.frequency.setValueAtTime(2200, t)
    bandpass.frequency.exponentialRampToValueAtTime(180, t + duration)

    // Soft tone underneath to add body
    const osc = ac.createOscillator()
    const oscGain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(320, t)
    osc.frequency.exponentialRampToValueAtTime(95, t + duration)
    oscGain.gain.setValueAtTime(0.07, t)
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(oscGain)
    oscGain.connect(ac.destination)
    osc.start(t)
    osc.stop(t + duration + 0.01)

    // Noise envelope
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.22, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

    source.connect(bandpass)
    bandpass.connect(gain)
    gain.connect(ac.destination)
    source.start(t)
    source.stop(t + duration + 0.01)
  } catch (_) {}
}

/** Soft descending "whoosh" — played when a node is deleted */
export function playDelete(): void {
  try {
    const ac = getCtx()

    // Main descending tone
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sine'
    const t = ac.currentTime
    osc.frequency.setValueAtTime(420, t)
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.26)
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    osc.start(t)
    osc.stop(t + 0.28)

    // Subtle noise-like shimmer on top
    const osc2  = ac.createOscillator()
    const gain2 = ac.createGain()
    osc2.connect(gain2)
    gain2.connect(ac.destination)
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(840, t)
    osc2.frequency.exponentialRampToValueAtTime(220, t + 0.20)
    gain2.gain.setValueAtTime(0.05, t)
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    osc2.start(t)
    osc2.stop(t + 0.22)
  } catch (_) {}
}
