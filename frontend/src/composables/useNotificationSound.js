import { ref } from 'vue'
import * as Tone from 'tone'

const STORAGE_KEY_SOUND = 'trackit_sound_enabled'
const STORAGE_KEY_PRESETS = 'trackit_sound_presets'

export const isSoundEnabled = ref(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY_SOUND) !== 'false'
    : true,
)

/**
 * 15 Custom Synthesized Tone.js Sound Profiles
 */
export const TONE_SOUND_PRESETS = [
  { id: 'chime_ascend', name: 'Ascending Chime', category: 'Melodic', desc: 'Nada triad C5-E5-G5 yang cerah dan positif' },
  { id: 'crystal_bell', name: 'Crystal Bell', category: 'Bell', desc: 'Lonceng kristal lembut dengan resonansi jernih' },
  { id: 'ping_minimal', name: 'Minimal Ping', category: 'Minimal', desc: 'Dentang tunggal halus berfrekuensi A5' },
  { id: 'marimba_pop', name: 'Warm Marimba', category: 'Acoustic', desc: 'Ketukan kayu marimba alami D5-G5-B5' },
  { id: 'radar_sonar', name: 'Sonar Pulse', category: 'Modern', desc: 'Pulsa frekuensi radio sonar modern' },
  { id: 'modern_beep', name: 'Digital Double Beep', category: 'Modern', desc: 'Dua ketukan staccato digital F5-A5' },
  { id: 'celesta_sparkle', name: 'Celesta Sparkle', category: 'Melodic', desc: 'Arpeggio riak sparkle G5-C6-E6-G6' },
  { id: 'glass_tap', name: 'Glass Tap', category: 'Acoustic', desc: 'Sentuhan kaca bening frekuensi tinggi' },
  { id: 'soft_harp', name: 'Soft Harp', category: 'Melodic', desc: 'Petikan harpa lembut F5-A5-C6-F6' },
  { id: 'tech_blip', name: 'Cyber Tech Blip', category: 'Modern', desc: 'Glissando mikro cepat untuk alur kerja cepat' },
  { id: 'bubble_pop', name: 'Organic Bubble Pop', category: 'Playful', desc: 'Letupan gelembung udara bernada naik' },
  { id: 'xylophone', name: 'Xylophone Strike', category: 'Acoustic', desc: 'Ketukan bilah kayu xilofon C6-G5-E6' },
  { id: 'vibraphone', name: 'Vibraphone Glow', category: 'Melodic', desc: 'Akord hangat vibrato A4-E5-C#6' },
  { id: 'alert_double', name: 'Urgent Alert Duo', category: 'Alert', desc: 'Dua nada peringatan F5-D5 beraksen tegas' },
  { id: 'zen_bowl', name: 'Zen Singing Bowl', category: 'Ambient', desc: 'Resonansi mangkuk Tibet harmonik D4-A4-F#5' },
]

// Default mappings per notification status
const DEFAULT_SOUND_MAP = {
  CREATED: 'chime_ascend',
  UPDATED: 'marimba_pop',
  COMMENT: 'ping_minimal',
  ALERT: 'alert_double',
  SUCCESS: 'crystal_bell',
}

function loadSoundMap() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SOUND_MAP }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS)
    return raw ? { ...DEFAULT_SOUND_MAP, ...JSON.parse(raw) } : { ...DEFAULT_SOUND_MAP }
  } catch {
    return { ...DEFAULT_SOUND_MAP }
  }
}

export const soundStatusMap = ref(loadSoundMap())

let synthInstance = null
let membraneInstance = null
let metalInstance = null
let audioContextStarted = false

/**
 * Lazily initialize Tone.js synthesizers and resume AudioContext upon user gesture
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
      synthInstance = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.005,
          decay: 0.22,
          sustain: 0.06,
          release: 0.65,
        },
        volume: -8,
      }).toDestination()
    }

    if (!membraneInstance) {
      membraneInstance = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.4 },
        volume: -6,
      }).toDestination()
    }

    if (!metalInstance) {
      metalInstance = new Tone.MetalSynth({
        frequency: 200,
        envelope: { attack: 0.001, decay: 0.15, release: 0.2 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -14,
      }).toDestination()
    }

    return { poly: synthInstance, membrane: membraneInstance, metal: metalInstance }
  } catch (err) {
    console.warn('[Tone.js] AudioContext initialization deferred until user gesture:', err)
    return null
  }
}

/**
 * Play one of the 15 specific synthesized sound presets directly by ID
 * @param {string} soundId
 */
export async function playSoundById(soundId = 'chime_ascend') {
  if (!isSoundEnabled.value) return

  try {
    const synths = await ensureAudioReady()
    if (!synths) return

    const { poly, membrane, metal } = synths
    const now = Tone.now()

    switch (soundId) {
      case 'chime_ascend':
        // C5 -> E5 -> G5 ascending chime
        poly.triggerAttackRelease('C5', '16n', now)
        poly.triggerAttackRelease('E5', '16n', now + 0.08)
        poly.triggerAttackRelease('G5', '8n', now + 0.16)
        break

      case 'crystal_bell':
        // High crystalline bell E6 -> B5 -> G#5
        poly.triggerAttackRelease('E6', '16n', now, 0.7)
        poly.triggerAttackRelease('B5', '16n', now + 0.09, 0.8)
        poly.triggerAttackRelease('G#5', '8n', now + 0.18, 0.9)
        break

      case 'ping_minimal':
        // Crisp minimal pure sine ping A5
        poly.triggerAttackRelease('A5', '12n', now, 0.85)
        break

      case 'marimba_pop':
        // Warm marimba pop D5 -> G5 -> B5
        membrane.triggerAttackRelease('D5', '16n', now, 0.7)
        membrane.triggerAttackRelease('G5', '16n', now + 0.07, 0.8)
        membrane.triggerAttackRelease('B5', '8n', now + 0.14, 0.9)
        break

      case 'radar_sonar':
        // Sonar chirp G5 -> D6
        poly.triggerAttackRelease('G5', '32n', now, 0.6)
        poly.triggerAttackRelease('D6', '8n', now + 0.06, 0.9)
        break

      case 'modern_beep':
        // Staccato dual digital beep F5 -> A5
        poly.triggerAttackRelease('F5', '32n', now, 0.8)
        poly.triggerAttackRelease('A5', '16n', now + 0.09, 0.85)
        break

      case 'celesta_sparkle':
        // Rapid 4-note sparkle G5 -> C6 -> E6 -> G6
        poly.triggerAttackRelease('G5', '32n', now, 0.6)
        poly.triggerAttackRelease('C6', '32n', now + 0.05, 0.7)
        poly.triggerAttackRelease('E6', '32n', now + 0.1, 0.8)
        poly.triggerAttackRelease('G6', '8n', now + 0.15, 0.9)
        break

      case 'glass_tap':
        // High resonance glass tap E6 -> A6
        metal.triggerAttackRelease('16n', now, 0.4)
        poly.triggerAttackRelease('E6', '32n', now, 0.7)
        poly.triggerAttackRelease('A6', '8n', now + 0.05, 0.85)
        break

      case 'soft_harp':
        // Glissando F5 -> A5 -> C6 -> F6
        poly.triggerAttackRelease('F5', '16n', now, 0.6)
        poly.triggerAttackRelease('A5', '16n', now + 0.07, 0.7)
        poly.triggerAttackRelease('C6', '16n', now + 0.14, 0.8)
        poly.triggerAttackRelease('F6', '8n', now + 0.21, 0.85)
        break

      case 'tech_blip':
        // Quick glide D6 -> G5
        poly.triggerAttackRelease('D6', '32n', now, 0.9)
        poly.triggerAttackRelease('G5', '16n', now + 0.04, 0.8)
        break

      case 'bubble_pop':
        // Organic bubble membrane pop
        membrane.triggerAttackRelease('F4', '16n', now, 0.9)
        membrane.triggerAttackRelease('C5', '8n', now + 0.06, 0.7)
        break

      case 'xylophone':
        // Xylophone strike C6 -> G5 -> E6
        poly.triggerAttackRelease('C6', '16n', now, 0.8)
        poly.triggerAttackRelease('G5', '16n', now + 0.07, 0.7)
        poly.triggerAttackRelease('E6', '8n', now + 0.14, 0.9)
        break

      case 'vibraphone':
        // Lush vibraphone chord A4 + E5 + C#6
        poly.triggerAttackRelease(['A4', 'E5', 'C#6'], '6n', now, 0.75)
        break

      case 'alert_double':
        // Urgent double alert F5 -> D5
        poly.triggerAttackRelease('F5', '16n', now, 0.9)
        poly.triggerAttackRelease('D5', '8n', now + 0.11, 0.95)
        break

      case 'zen_bowl':
        // Singing bowl harmonic D4 + A4 + F#5
        poly.triggerAttackRelease(['D4', 'A4', 'F#5'], '2n', now, 0.7)
        break

      default:
        poly.triggerAttackRelease('C5', '16n', now)
        poly.triggerAttackRelease('G5', '8n', now + 0.1)
        break
    }
  } catch (err) {
    console.debug('[Tone.js Notification Sound] Playback skipped:', err?.message || err)
  }
}

/**
 * Play harmonic notification tones based on configured event status
 * @param {'CREATED'|'UPDATED'|'COMMENT'|'ALERT'|'SUCCESS'|'TIKET_BARU'|'PERUBAHAN'|'KOMENTAR'|'WARNING'} type
 */
export async function playToneNotification(type = 'CREATED') {
  if (!isSoundEnabled.value) return

  const normalized = String(type).toUpperCase()
  let categoryKey

  if (['CREATED', 'TIKET_BARU', 'PENGAJUAN'].includes(normalized)) {
    categoryKey = 'CREATED'
  } else if (['UPDATED', 'PERUBAHAN', 'STATUS_CHANGE'].includes(normalized)) {
    categoryKey = 'UPDATED'
  } else if (['COMMENT', 'KOMENTAR', 'MESSAGE'].includes(normalized)) {
    categoryKey = 'COMMENT'
  } else if (['ALERT', 'WARNING', 'ERROR', 'CRITICAL'].includes(normalized)) {
    categoryKey = 'ALERT'
  } else {
    categoryKey = 'SUCCESS'
  }

  const configuredSoundId = soundStatusMap.value[categoryKey] || DEFAULT_SOUND_MAP[categoryKey] || 'chime_ascend'
  await playSoundById(configuredSoundId)
}

export function useNotificationSound() {
  function toggleSound() {
    isSoundEnabled.value = !isSoundEnabled.value
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SOUND, String(isSoundEnabled.value))
    }
    if (isSoundEnabled.value) {
      playSoundById('chime_ascend')
    }
  }

  function setSoundEnabled(val) {
    isSoundEnabled.value = !!val
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SOUND, String(isSoundEnabled.value))
    }
  }

  function setStatusSound(statusKey, soundId) {
    soundStatusMap.value = {
      ...soundStatusMap.value,
      [statusKey]: soundId,
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(soundStatusMap.value))
    }
    // Preview selected sound immediately
    playSoundById(soundId)
  }

  async function testSound(statusKey = 'CREATED') {
    isSoundEnabled.value = true
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SOUND, 'true')
    }
    await playToneNotification(statusKey)
  }

  return {
    isSoundEnabled,
    soundStatusMap,
    soundPresets: TONE_SOUND_PRESETS,
    toggleSound,
    setSoundEnabled,
    setStatusSound,
    testSound,
    playSoundById,
    playToneNotification,
    ensureAudioReady,
  }
}
