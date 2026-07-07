// Sound effect utilities for Baby Tracker
// Using Web Audio API to create sound effects programmatically

export const playSoundEffect = (type: 'click' | 'success' | 'notification') => {
  if (typeof window === 'undefined') return

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    switch (type) {
      case 'click':
        playClickSound(audioContext)
        break
      case 'success':
        playSuccessSound(audioContext)
        break
      case 'notification':
        playNotificationSound(audioContext)
        break
    }
  } catch (error) {
    console.log('[v0] Audio not supported:', error)
  }
}

// Simple click sound - short beep
const playClickSound = (audioContext: AudioContext) => {
  const now = audioContext.currentTime
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()

  osc.connect(gain)
  gain.connect(audioContext.destination)

  osc.frequency.setValueAtTime(800, now)
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.1)

  gain.gain.setValueAtTime(0.3, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

  osc.start(now)
  osc.stop(now + 0.1)
}

// Success sound - ascending tones
const playSuccessSound = (audioContext: AudioContext) => {
  const now = audioContext.currentTime
  const notes = [523.25, 659.25, 783.99] // C, E, G
  const duration = 0.1

  notes.forEach((freq, index) => {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.connect(gain)
    gain.connect(audioContext.destination)

    const startTime = now + index * duration
    osc.frequency.setValueAtTime(freq, startTime)
    gain.gain.setValueAtTime(0.3, startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    osc.start(startTime)
    osc.stop(startTime + duration)
  })
}

// Notification sound - cheerful chime
const playNotificationSound = (audioContext: AudioContext) => {
  const now = audioContext.currentTime
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()

  osc.connect(gain)
  gain.connect(audioContext.destination)

  osc.frequency.setValueAtTime(1046.5, now) // High C
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

  osc.start(now)
  osc.stop(now + 0.3)
}
