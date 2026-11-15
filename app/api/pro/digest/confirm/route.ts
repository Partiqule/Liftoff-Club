import { NextResponse } from 'next/server'
import { confirmDigest } from '@/lib/pro/digest-store'
import { magicLinkOrigin } from '@/lib/site'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const email = token ? await confirmDigest(token) : null
  const next = new URL('/pro/digest', magicLinkOrigin())
  next.searchParams.set('joined', email ? '1' : '0')
  return NextResponse.redirect(next)
}
