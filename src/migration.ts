// Endereço antigo (GitHub Pages do FelipeKogake) que deve redirecionar para o novo.
export const OLD_HOSTNAME = 'felipekogake.github.io'
export const NEW_SITE_URL = 'https://tech-2d.github.io/Agenda/'

// O aviso só aparece no endereço antigo — o mesmo código publicado no endereço
// novo (ou rodando em localhost) não mostra nada.
export function shouldShowMoveNotice(hostname: string) {
  return hostname === OLD_HOSTNAME
}
