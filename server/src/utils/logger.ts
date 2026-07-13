export function logInfo(message: string, data?: unknown) {
  console.log(`[INFO] ${message}`, data ?? '')
}

export function logError(message: string, error?: unknown) {
  console.error(`[ERROR] ${message}`, error ?? '')
}
