import { describe, expect, it } from 'vitest'
import { NEW_SITE_URL, shouldShowMoveNotice } from './migration'

describe('aviso de mudança de endereço', () => {
  it('aparece só no endereço antigo', () => {
    expect(shouldShowMoveNotice('felipekogake.github.io')).toBe(true)
    expect(shouldShowMoveNotice('tech-2d.github.io')).toBe(false)
    expect(shouldShowMoveNotice('localhost')).toBe(false)
  })

  it('aponta para o novo endereço', () => {
    expect(NEW_SITE_URL).toBe('https://tech-2d.github.io/Agenda/')
  })
})
