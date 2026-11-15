import { track as send } from '@vercel/analytics'

/** Named counts only. Do not pass a name, email, town, or other personal field. */
export type ClubEvent = 'launch_viewed' | 'launch_day_opened' | 'alert_enabled' | 'app_installed' | 'pro_signup_submitted' | 'pro_access_clicked'

export function track(event: ClubEvent): void {
  try {
    send(event)
  } catch {
    // Analytics is optional. A missing script must not break the page.
  }
}
