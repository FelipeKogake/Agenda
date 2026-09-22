import type { Activity } from './types'

export const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isToday(date: Date, now = new Date()) {
  return isSameDay(date, now)
}

export function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const start = new Date(year, month, 1 - firstDay.getDay())
  const weeks: Date[][] = []
  let cursor = start
  do {
    const week: Date[] = []
    for (let i = 0; i < 7; i += 1) {
      week.push(cursor)
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getMonth() === month || weeks.length < 4)
  return weeks
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function compareActivities(a: Activity, b: Activity) {
  if (!a.time && !b.time) return a.title.localeCompare(b.title, 'pt-BR')
  if (!a.time) return -1
  if (!b.time) return 1
  return timeToMinutes(a.time) - timeToMinutes(b.time)
}

export function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matchesSearch(activity: Activity, term: string) {
  const query = normalize(term)
  if (!query) return true
  return [activity.title, activity.description].some((field) => normalize(field).includes(query))
}
