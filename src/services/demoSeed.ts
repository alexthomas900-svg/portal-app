import { apiPost } from '../lib/api'
import type { UserProfile } from '../types'

const SEEDED_FLAG_PREFIX = 'fcc-demo-seeded:'

function shouldSeed() {
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_SEED === 'true'
}

export async function seedDemoDataIfNeeded(profile: UserProfile): Promise<void> {
  if (!shouldSeed()) return

  const seededKey = `${SEEDED_FLAG_PREFIX}${profile.uid}`
  if (window.localStorage.getItem(seededKey) === '1') return

  try {
    await apiPost('/api/applications/seed', {})
  } catch (err) {
    console.warn('Demo seed failed:', err)
  }

  window.localStorage.setItem(seededKey, '1')
}
