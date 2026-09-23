import { describe, expect, it } from 'vitest'
import { compareActivities, dateKey, getMonthMatrix, isSameDay, matchesSearch, parseDateKey } from './calendar'
import type { Activity } from './types'

const base: Activity = {
  id: '1',
  title: 'Prova de Matemática',
  description: 'Capítulos 3 a 5',
  type: 'trabalho',
  subject: 'Matemática',
  date: '2026-09-25',
  time: '14:00',
  turmaId: '2º Fin A',
}

describe('calendar helpers', () => {
  it('formata e interpreta chaves de data sem depender de fuso', () => {
    const date = new Date(2026, 8, 25)
    expect(dateKey(date)).toBe('2026-09-25')
    expect(isSameDay(parseDateKey('2026-09-25'), date)).toBe(true)
  })

  it('gera uma matriz de semanas cobrindo o mês inteiro', () => {
    const weeks = getMonthMatrix(2026, 8) // setembro (mês 0-indexado)
    const allDays = weeks.flat()
    expect(allDays[0].getDay()).toBe(0) // primeira célula é sempre domingo
    expect(allDays.some((day) => day.getFullYear() === 2026 && day.getMonth() === 8 && day.getDate() === 1)).toBe(true)
    expect(allDays.some((day) => day.getFullYear() === 2026 && day.getMonth() === 8 && day.getDate() === 30)).toBe(true)
  })

  it('ordena atividades sem horário antes das com horário', () => {
    const semHorario: Activity = { ...base, id: '2', time: null, title: 'Entrega do trabalho' }
    const [first, second] = [base, semHorario].sort(compareActivities)
    expect(first.id).toBe('2')
    expect(second.id).toBe('1')
  })

  it('busca sem diferenciar acentos ou maiúsculas', () => {
    expect(matchesSearch(base, 'matematica')).toBe(true)
    expect(matchesSearch(base, 'CAPITULOS')).toBe(true)
  })
})
