const KEY = 'agenda:announcementSeenAt'

export function readAnnouncementSeenAt(): number {
  try {
    return Number(window.localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

export function markAnnouncementSeen(updatedAtMs: number) {
  try {
    window.localStorage.setItem(KEY, String(updatedAtMs))
  } catch {
    // localStorage indisponível — o aviso pode reaparecer na próxima visita.
  }
}
