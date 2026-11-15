'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { iosNeedsHomeScreen, readFollowedLaunchIds, urlBase64ToUint8Array, writeFollowedLaunchIds, PUSH_LAUNCHES_KEY } from '@/lib/push/browser'

const NO_LAUNCHES: string[] = []
import { clearClubStorage, defaultSettings } from '@/lib/settings'

type InstallPrompt = Event & { prompt: () => Promise<void> }
type PushReady = 'unknown' | 'on' | 'off'

let clientFlag = false
function subscribeClientFlag(listener: () => void) {
  if (clientFlag) return () => {}
  const id = window.setTimeout(() => {
    if (!clientFlag) {
      clientFlag = true
      listener()
    }
  }, 0)
  return () => window.clearTimeout(id)
}

let pushReady: PushReady = 'unknown'
const pushListeners = new Set<() => void>()
let pushStarted = false

function ensurePushReady() {
  if (pushStarted || typeof window === 'undefined') return
  pushStarted = true
  fetch('/api/push/config')
    .then((response) => response.json())
    .then((data: { enabled?: boolean }) => {
      pushReady = data.enabled ? 'on' : 'off'
      pushListeners.forEach((listener) => listener())
    })
    .catch(() => {
      pushReady = 'off'
      pushListeners.forEach((listener) => listener())
    })
}

export function usePushReady(): PushReady {
  return useSyncExternalStore(
    (listener) => {
      pushListeners.add(listener)
      ensurePushReady()
      return () => pushListeners.delete(listener)
    },
    () => pushReady,
    () => 'unknown',
  )
}

let installPrompt: InstallPrompt | null = null
const installListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event as InstallPrompt
    installListeners.forEach((listener) => listener())
  })
}

function subscribeInstall(listener: () => void) {
  installListeners.add(listener)
  return () => installListeners.delete(listener)
}

function subscribePush(listener: () => void) {
  window.addEventListener('liftoff-push', listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener('liftoff-push', listener)
    window.removeEventListener('storage', listener)
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

async function syncSubscription(input: { kidsMode: boolean; quietStart: string; quietEnd: string; timezone: string; launchIds: string[] }) {
  const subscription = await currentSubscription()
  if (!subscription) return
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      launchIds: input.launchIds,
      quietStart: input.quietStart,
      quietEnd: input.quietEnd,
      timezone: input.timezone,
      kidsMode: input.kidsMode,
    }),
  })
}

export function PhoneAlerts() {
  const { settings, updateSettings } = useClub()
  const pushReady = usePushReady()
  const pushEnabled = pushReady === 'on'
  const prompt = useSyncExternalStore(subscribeInstall, () => installPrompt, () => null)
  const ios = useSyncExternalStore(subscribeClientFlag, () => clientFlag && iosNeedsHomeScreen(), () => false)
  const followed = useSyncExternalStore(subscribePush, readFollowedLaunchIds, () => NO_LAUNCHES)
  const timezone = settings.location?.timezone ?? 'America/Denver'

  useEffect(() => {
    if (!pushEnabled) return
    void syncPhoneAlerts({ kidsMode: settings.kidsMode, quietStart: settings.quietStart, quietEnd: settings.quietEnd, timezone })
  }, [pushEnabled, settings.kidsMode, settings.quietStart, settings.quietEnd, timezone])

  async function allow() {
    if (!pushEnabled || settings.kidsMode || ios) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    const registration = await navigator.serviceWorker.register('/sw.js')
    const config = (await fetch('/api/push/config').then((response) => response.json())) as { enabled?: boolean; publicKey?: string }
    if (!config.enabled || !config.publicKey) return
    const key = urlBase64ToUint8Array(config.publicKey)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    })
    const launchIds = readFollowedLaunchIds()
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        launchIds,
        quietStart: settings.quietStart,
        quietEnd: settings.quietEnd,
        timezone: settings.location?.timezone ?? 'America/Denver',
        kidsMode: false,
      }),
    })
    updateSettings({ ...settings, notifications: { ...settings.notifications, enabled: true } })
  }

  async function erase() {
    const subscription = await currentSubscription().catch(() => null)
    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined)
      await subscription.unsubscribe().catch(() => undefined)
    }
    writeFollowedLaunchIds([])
    clearClubStorage()
    window.localStorage.removeItem(PUSH_LAUNCHES_KEY)
    updateSettings(defaultSettings)
  }

  return (
    <>
      <section>
        <p className="kicker">On a phone</p>
        <h2>Add Liftoff Club to the home screen</h2>
        <p className="lede">The rocket C icon is the app icon. A home screen icon opens the club without the browser bar. iOS delivers launch alerts only after that install.</p>
        {prompt ? (
          <button className="btn" type="button" onClick={() => void prompt.prompt()}>
            Add to this phone
          </button>
        ) : null}
        {ios ? (
          <ol className="install-steps">
            <li>Open this site in Safari.</li>
            <li>Tap Share.</li>
            <li>Tap Add to Home Screen.</li>
            <li>Open Liftoff Club from the new icon, then come back to this page.</li>
          </ol>
        ) : (
          <p className="meta">On Android or desktop Chrome, use the button when the browser offers it. You can also use the browser menu and choose Install.</p>
        )}
      </section>

      <section>
        <p className="kicker">Phone alerts</p>
        <h2>One hour before, and at liftoff</h2>
        {settings.kidsMode ? (
          <p className="lede">Kids mode is on, so phone alerts stay off. A parent turns kids mode off, then allows alerts. Times in the alert are Mountain Time.</p>
        ) : pushReady === 'unknown' ? (
          <p className="lede">Checking whether this copy can send phone alerts. Times in the alert are Mountain Time.</p>
        ) : !pushEnabled ? (
          <p className="lede">This copy of the site does not have phone alerts turned on yet. The calendar feed still works. Times in the alert are Mountain Time.</p>
        ) : ios ? (
          <p className="lede">Add Liftoff Club to the home screen first. iOS only sends web alerts to an installed home screen app. Times in the alert are Mountain Time.</p>
        ) : (
          <>
            <p className="lede">
              A parent can allow alerts for launches they follow. You get a note about one hour before liftoff, at liftoff, and when the public clock moves. Times are Mountain Time. Quiet hours still apply.
            </p>
            <button className="btn" type="button" onClick={() => void allow()}>
              Allow phone alerts
            </button>
            <p className="meta">{followed.length === 0 ? 'No launch is followed on this phone yet. Open a launch and choose Remind this phone.' : `${followed.length} launch${followed.length === 1 ? '' : 'es'} followed on this phone.`}</p>
          </>
        )}
      </section>

      <section>
        <p className="kicker">Privacy</p>
        <h2>What this browser keeps</h2>
        <p className="lede">
          Town, kids mode, quiet hours, companies you follow, space words you open, and which alerts already fired. Phone alerts, when a parent allows them, store a browser address so a launch time can be sent. No name and no email. Weather and city search go straight from your browser to Open-Meteo.
        </p>
        <button className="btn btn-quiet" type="button" onClick={() => void erase()}>
          Erase saved settings
        </button>
      </section>
    </>
  )
}

export async function syncPhoneAlerts(input: { kidsMode: boolean; quietStart: string; quietEnd: string; timezone: string }) {
  await syncSubscription({ ...input, launchIds: readFollowedLaunchIds() })
}
