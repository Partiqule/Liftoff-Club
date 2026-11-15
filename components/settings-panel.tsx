'use client'

import { LocationEditor } from '@/components/location-editor'
import { useClub } from '@/components/club-provider'
import { clearClubStorage, defaultSettings } from '@/lib/settings'

export function SettingsPanel({ providers }: { providers: string[] }) {
  const { settings, updateSettings, notifyPermission, enableNotifications } = useClub()
  const notes = settings.notifications
  return (
    <div className="house">
      <section>
        <p className="kicker">Reading voice</p>
        <h2>Kids mode is the default</h2>
        <p className="lede">Plain words for a seven-year-old. Turn it off when you want the fuller account. There are no kid accounts and no grown-up accounts.</p>
        <button
          className="switch"
          type="button"
          role="switch"
          aria-checked={settings.kidsMode}
          onClick={() => updateSettings({ ...settings, kidsMode: !settings.kidsMode })}
        >
          <span className="switch-ui" data-on={settings.kidsMode ? 'true' : 'false'} />
          <span className="switch-label">{settings.kidsMode ? 'Kids mode on' : 'Kids mode off'}</span>
        </button>
      </section>

      <LocationEditor />

      <section>
        <p className="kicker">Bedtime</p>
        <h2>Quiet hours for alerts</h2>
        <p className="lede">
          The countdown still works. Browser alerts stay silent between these hours, in the timezone of the town you set. Your phone’s own calendar alarms are separate.
        </p>
        <div className="quiet-fields">
          <label>
            From
            <input
              type="time"
              value={settings.quietStart}
              onChange={(event) => updateSettings({ ...settings, quietStart: event.target.value || defaultSettings.quietStart })}
            />
          </label>
          <label>
            Until
            <input
              type="time"
              value={settings.quietEnd}
              onChange={(event) => updateSettings({ ...settings, quietEnd: event.target.value || defaultSettings.quietEnd })}
            />
          </label>
        </div>
      </section>

      <section>
        <p className="kicker">Alerts</p>
        <h2>A nudge, not a promise</h2>
        <p className="lede">
          Alerts fire while this tab is open, and on phones that allow alerts from an installed web app. A sleeping phone may stay quiet. The calendar feed is the reliable reminder.
        </p>
        {notifyPermission === 'unsupported' ? (
          <p className="note">This browser does not offer notifications. Subscribe to the launch calendar instead.</p>
        ) : (
          <button className="btn" type="button" onClick={() => void enableNotifications()}>
            {notes.enabled && notifyPermission === 'granted' ? 'Alerts are on' : 'Allow alerts'}
          </button>
        )}
        <div className="choice" style={{ marginTop: '0.8rem' }} role="group" aria-label="How early">
          {([30, 60, 180] as const).map((minutes) => (
            <button
              key={minutes}
              className="btn btn-quiet"
              type="button"
              aria-pressed={notes.leadMinutes === minutes}
              onClick={() => updateSettings({ ...settings, notifications: { ...notes, leadMinutes: minutes } })}
            >
              {minutes} min before
            </button>
          ))}
        </div>
        <div className="choice" role="group" aria-label="Which providers">
          {(
            [
              ['all', 'All providers'],
              ['spacex', 'SpaceX only'],
              ['chosen', 'Choose'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              className="btn btn-quiet"
              type="button"
              aria-pressed={notes.providerMode === mode}
              onClick={() => updateSettings({ ...settings, notifications: { ...notes, providerMode: mode } })}
            >
              {label}
            </button>
          ))}
        </div>
        {notes.providerMode === 'chosen' ? (
          <div>
            {providers.map((provider) => {
              const on = notes.providers.includes(provider)
              return (
                <label className="check" key={provider}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = on ? notes.providers.filter((item) => item !== provider) : [...notes.providers, provider]
                      updateSettings({ ...settings, notifications: { ...notes, providers: next } })
                    }}
                  />
                  <span>{provider}</span>
                </label>
              )
            })}
          </div>
        ) : null}
        <label className="check">
          <input
            type="checkbox"
            checked={notes.visibleOnly}
            onChange={(event) => updateSettings({ ...settings, notifications: { ...notes, visibleOnly: event.target.checked } })}
          />
          <span>Only if we might see it from the saved town</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={notes.includeSky}
            onChange={(event) => updateSettings({ ...settings, notifications: { ...notes, includeSky: event.target.checked } })}
          />
          <span>Include space station and Starlink passes</span>
        </label>
      </section>

      <section>
        <p className="kicker">Privacy</p>
        <h2>What this browser keeps</h2>
        <p className="lede">
          Town, kids mode, quiet hours, and which alerts already fired. No name, no email, no account. Weather and city search go straight from your browser to Open-Meteo. If the site is deployed on Vercel, page counts can be turned on there. They are cookieless and we strip query strings.
        </p>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => {
            clearClubStorage()
            updateSettings(defaultSettings)
          }}
        >
          Erase saved settings
        </button>
      </section>
    </div>
  )
}
