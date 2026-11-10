// Versão publicada do site, injetada no build pelo Vite (ver `define` em vite.config.ts).
// Na pipeline, o hash vem do commit que disparou o GitHub Actions (GITHUB_SHA);
// rodando localmente, aparece "dev".
export const APP_VERSION = __APP_VERSION__
export const BUILD_DATE = __BUILD_DATE__

// "Versão 0db2b2b · build 10/11/2026" — usado para conferir, no site publicado,
// que o deploy mais recente realmente entrou no ar.
export function formatVersion(version: string, isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split('-')
  return `Versão ${version} · build ${day}/${month}/${year}`
}
