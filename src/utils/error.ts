export const disconnectedText = 'transport disconnected'

export function shouldIgnore(err: any) {
  if (err instanceof Error && err.message === disconnectedText) return true
  return false
}
