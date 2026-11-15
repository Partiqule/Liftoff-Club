'use client'

import { useEffect } from 'react'
import { SCHEDULE_KEY, type IosSchedule } from '@/lib/ios/schedule'

export function RememberSchedule({ schedule }: { schedule: IosSchedule }) {
  useEffect(() => {
    try {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule))
    } catch {
      // A private browser can refuse storage. The live page still works.
    }
  }, [schedule])
  return null
}
