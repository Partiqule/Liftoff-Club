import path from 'node:path'

/** Writable cache file. Vercel serverless can write `/tmp` and cannot write the project directory. */
export function runtimeCachePath(fileName: string, env: { VERCEL?: string } = { VERCEL: process.env.VERCEL }, cwd = process.cwd()): string {
  if (env.VERCEL) return path.posix.join('/tmp', fileName)
  return path.join(cwd, '.cache', fileName)
}
