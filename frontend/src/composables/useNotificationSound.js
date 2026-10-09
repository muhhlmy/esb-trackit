import { ref } from 'vue'
import * as Tone from 'tone'

const STORAGE_KEY_SOUND = 'trackit_sound_enabled'
const isSoundEnabled = ref(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY_SOUND) !== 'false'
    : true,
)

let synthInstance = null
let audioContextStarted = false

/**
 * Lazily initialize Tone.js synthesizer and resume AudioContext upon first user interaction
 */
export async function ensureAudioReady() {
  try {
    if (!audioContextStarted && typeof window !== 'undefined') {
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }
      audioContextStarted = true
    }

    if (!synthInstance) {
      // Use PolySynth with a gentle, crystal-clean sine/triangle acoustic profile
      synthInstance = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.005,
          decay: 0.18,
          sustain: 0.05,
          release: 0.6,
        },
        volume: -10, // Comfortable loudness for enterprise notifications
      }).toDestination()
    }
    return synthInstance
  } catch (err) {
    console.warn('[Tone.js] AudioContext initialization deferred until user gesture:', err)
    return null
  }
}

/**
 * Play harmonic notification tones synthesized directly in real-time
 * @param {'CREATED'|'UPDATED'|'COMMENT'|'ALERT'|'SUCCESS'} type
 */
export async function playToneNotification(type = 'CREATED') {
  if (!isSoundEnabled.value) return

  try {
    const synth = await ensureAudioReady()
    if (!synth) return

    const now = Tone.now()

    switch (type.toUpperCase()) {
      case 'CREATED':
      case 'TIKET_BARU':
        // Uplifting ascending chime: C5 -> G5
        synth.triggerAttackRelease('C5', '16n', now)
        synth.triggerAttackRelease('G5', '8n', now + 0.1)
        break

      case 'UPDATED':
      case 'PERUBAHAN':
        // Soft informative chime: E5 -> B5
        synth.triggerAttackRelease('E5', '16n', now)
        synth.triggerAttackRelease('B5', '8n', now + 0.09)
        break

      case 'COMMENT':
      case 'KOMENTAR':
        // Quick gentle ping: A5
        synth.triggerAttackRelease('A5', '12n', now)
        break

      case 'ALERT':
      case 'WARNING':
        // Dual alert tone: F5 -> D5
        synth.triggerAttackRelease('F5', '16n', now)
        synth.triggerAttackRelease('D5', '12n', now + 0.12)
        break

      case 'SUCCESS':
      default:
        // Pleasant ascending major chord: C5 -> E5 -> G5
        synth.triggerAttackRelease('C5', '16n', now)
        synth.triggerAttackRelease('E5', '16n', now + 0.08)
        synth.triggerAttackRelease('G5', '8n', now + 0.16)
        break
    }
  } catch (e) {
    // Gracefully ignore audio autoplay restriction errors if blocked by browser policy
    console.debug('[Tone.js Notification Sound] Playback skipped:', e?.message || e)
  }
}

export function useNotificationSound() {
  function toggleSound() {
    isSoundEnabled.value = !isSoundEnabled.value
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SOUND, String(isSoundEnabled.value))
    }
    if (isSoundEnabled.value) {
      playToneNotification('SUCCESS')
    }
  }

  function setSoundEnabled(val) {
    isSoundEnabled.value = !!val
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SOUND, String(isSoundEnabled.value))
    }
  }

  async function testSound() {
    isSoundEnabled.value = true
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SOUND, 'true')
    }
    await playToneNotification('CREATED')
  }

  return {
    isSoundEnabled,
    toggleSound,
    setSoundEnabled,
    testSound,
    playToneNotification,
    ensureAudioReady,
  }
}
