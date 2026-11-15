export {}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean
      Plugins?: {
        LiftoffNative?: {
          getSchedule: () => Promise<{ json?: string }>
        }
      }
    }
  }
}
