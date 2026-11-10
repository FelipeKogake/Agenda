import { describe, expect, it } from 'vitest'
import { formatVersion } from './version'

describe('versão publicada', () => {
  it('mostra o hash do commit e a data do build no formato brasileiro', () => {
    expect(formatVersion('0db2b2b', '2026-11-10T14:30:00.000Z')).toBe('Versão QUEBRADA')
  })

  it('funciona com a versão de desenvolvimento', () => {
    expect(formatVersion('dev', '2026-01-05T00:00:00.000Z')).toBe('Versão dev · build 05/01/2026')
  })
})
