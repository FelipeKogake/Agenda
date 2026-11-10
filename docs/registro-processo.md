# Registro do processo — Pipeline CI/CD com IA generativa

Registro cronológico das interações com a IA (Claude Code), mantido durante a própria conversa.
Só entra aqui o que realmente aconteceu no chat. O que foi feito fora dele está marcado como **[PREENCHER]**.

Legenda de autoria: **IA** = alteração feita pela IA · **Manual** = feita pelo aluno.

---

## Interação 1 — Análise do projeto (Fase 1)

**Prompt (resumo; o texto completo vai no relatório):** pedido para atuar como assistente de DevOps e construir, em 6 fases, uma pipeline CI/CD com GitHub Actions para o projeto, com o enunciado da atividade (PDF) anexado. A primeira fase pedia para analisar o repositório e recomendar uma estratégia de deploy.

**Resultado:**
- Projeto identificado: SPA em React 19 + TypeScript + Vite 7, com npm (`package-lock.json`), Firebase (Auth + Firestore) acessado direto do navegador, sem backend próprio e sem Dockerfile.
- Scripts existentes: `lint`, `typecheck`, `test` (Vitest, 6 testes) e `build`.
- Verificação local (Node 22): `npm ci`, `lint`, `test` (6/6) e `build` passaram. O único aviso foi o de bundle maior que 500 kB, que não é erro.
- Já havia um workflow `.github/workflows/deploy.yml` ("Publicar site") com 7 execuções bem-sucedidas, que fazia build e deploy no GitHub Pages.
- Estratégia recomendada: **GitHub Pages**. Vercel/Netlify, Render/Railway e Docker foram descartados, com justificativa.

**Problemas encontrados:**
1. O `deploy.yml` existente **não atendia** à atividade: não rodava em `pull_request` e não executava lint nem testes antes do deploy.
2. O endereço publicado por este repositório (`felipekogake.github.io/Agenda`) mostra um aviso que bloqueia o uso e redireciona para `tech-2d.github.io/Agenda` (`src/migration.ts`). Isso afeta a evidência de "aplicação publicada".

**Alteração realizada:** nenhuma (fase só de análise). A IA perguntou ao aluno como lidar com o problema 2.

---

## Interação 2 — Implementação (Fase 2)

**Prompt:** "Opção 1, pode seguir para a Fase 2, pode apenas fazer uma pequena alteração que comprove alguma mudança no projeto"

**Resultado (alterações feitas pela IA):**

| Arquivo | Alteração | Autoria |
|---|---|---|
| `.github/workflows/ci-cd.yml` | Novo workflow com o job `ci` (checkout, Node 22, `npm ci`, lint, testes, build e empacotamento do site) e o job `deploy` (`needs: ci`, `if:` só em push na main, `deploy-pages`) | IA |
| `.github/workflows/deploy.yml` | Removido, para não haver dois deploys concorrentes no mesmo push | IA |
| `src/version.ts`, `src/version.test.ts` | Função `formatVersion` e 2 testes unitários | IA |
| `vite.config.ts`, `src/vite-env.d.ts` | Injeção do hash do commit (`GITHUB_SHA`) e da data do build em tempo de build | IA |
| `src/App.tsx`, `src/styles.css` | Linha "Versão abc1234 · build dd/mm/aaaa" no aviso exibido no site publicado (a "pequena alteração que comprova a mudança") | IA |
| `README.md` | Seção de deploy atualizada para a nova pipeline | IA |

Versões das actions conferidas no GitHub (tags mais recentes em 10/11/2026), em vez de usar as da memória da IA: `checkout@v7`, `setup-node@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`. Também foram lidos os `action.yml` para confirmar que as entradas usadas (`node-version`, `cache`, `path`) continuam existindo. O workflow antigo usava as v4/v3/v5.

**Validações feitas pela IA antes do commit:**
- `npm run lint` ✅, `npm test` ✅ (8/8: 6 antigos + 2 novos), `GITHUB_SHA=abcdef1234567 npm run build` ✅, com `abcdef1` presente no JavaScript gerado.
- Parse do YAML com Python e checagem automática dos requisitos (push/PR na main, checkout, setup-node, `npm ci`, lint/test/build, `needs: ci`, `if` de push na main, deploy-pages, permissões mínimas): todos OK.
- Print local do aviso com a linha "Versão abcdef1 · build 10/11/2026".

**Problemas encontrados durante a interação:**
1. **Validação com actionlint bloqueada.** A IA tentou baixar o binário do `actionlint` (linter de workflows do GitHub Actions) e o ambiente negou: `Permission for this action was denied ... Reason: [Code from External]`.
   → **Contorno (IA):** validação do YAML com o parser Python mais a checagem programática dos requisitos. A validação definitiva fica para a execução real no GitHub Actions.
2. **Print local falhou na primeira tentativa.** Para o aviso aparecer, o domínio `felipekogake.github.io` foi apontado para o servidor local, mas o `vite preview` recusou a requisição:
   ```
   Blocked request. This host ("felipekogake.github.io") is not allowed.
   To allow this host, add "felipekogake.github.io" to `preview.allowedHosts` in vite.config.js.
   ```
   → **Causa:** proteção do Vite contra hostnames desconhecidos (DNS rebinding).
   → **Correção (IA):** em vez de mexer na configuração do projeto só para o teste, o `dist/` foi servido com `python3 -m http.server`. O print funcionou.

3. **Push recusado pelo GitHub (403).** Ao enviar o commit para a branch `claude/happy-johnson-8wojly`:
   ```
   remote: Claude doesn't have GitHub access to FelipeKogake/Agenda for your organization. An org admin can install the Claude GitHub App ...
   fatal: unable to access 'https://github.com/FelipeKogake/Agenda/': The requested URL returned error: 403
   ```
   → **Causa:** a IA consegue *ler* o repositório (inclusive o histórico do Actions), mas o GitHub App do Claude não tem permissão de *escrita* nele.
   → A IA tentou de novo uma vez e reanexou o repositório pedindo acesso de push; o erro continuou. A correção depende do aluno (instalar/reconectar o GitHub App). **[PREENCHER: o que foi feito para resolver]**

---

<!-- As próximas interações (execuções no GitHub Actions, PR, merge, teste negativo) são acrescentadas abaixo conforme acontecem. -->
