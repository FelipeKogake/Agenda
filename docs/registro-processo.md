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
   → A IA tentou de novo uma vez e reanexou o repositório pedindo acesso de push; o erro continuou. A correção dependia do aluno — ver Interações 3 e 4.

---

## Interação 3 — Tentativa de push após reconectar o GitHub

**Prompt:** "Pronto, reconectei o GitHub, pode fazer o push"

**Resultado:** o push continuou recusado com a mesma mensagem 403. A IA então tentou criar a branch pela API do GitHub (ferramenta MCP), e a API respondeu:
```
failed to create branch: POST https://api.github.com/repos/FelipeKogake/Agenda/git/refs: 403 Resource not accessible by integration
```

**Diagnóstico (IA):** reconectar a conta não bastou. A mensagem "Resource not accessible by integration" indica que o **Claude GitHub App não está instalado no repositório**, ou está instalado sem permissão de escrita em *Contents*. A leitura funciona porque o repositório é público.

**Alteração realizada:** nenhuma no GitHub. Para não perder o trabalho, a IA gerou um arquivo `.patch` com os commits locais, que pode ser aplicado manualmente.

---

## Interação 4 — Push liberado após instalar o GitHub App (alteração manual)

**Prompt:** "Instalei o app no repositório, tenta o push de novo e acho que consegui vincular as contas do claude e github"

**Alteração manual (aluno):** instalou o Claude GitHub App no repositório `FelipeKogake/Agenda` e vinculou as contas Claude ↔ GitHub. **[PREENCHER: print da tela de instalação do app, se tiver]**

**Resultado:** o push funcionou:
```
To https://github.com/FelipeKogake/Agenda
 * [new branch]      claude/happy-johnson-8wojly -> claude/happy-johnson-8wojly
```
Em seguida, a IA abriu um pull request da branch para a `main`, para testar o gatilho `pull_request` (só a CI deve rodar, sem deploy).

---

## Validação 1 — CI no pull request (sem deploy)

Execução acompanhada pela IA via API do GitHub: [CI/CD #1 — evento `pull_request`](https://github.com/FelipeKogake/Agenda/actions/runs/42729144127), PR [FelipeKogake/Agenda#1](https://github.com/FelipeKogake/Agenda/pull/1), commit `85463ba`.

| Job / passo | Resultado |
|---|---|
| CI → Checkout, Configurar Node.js, Instalar dependências, Lint, Testes, Build | success |
| CI → Empacotar site para o GitHub Pages | **skipped** (o `if:` só libera em push na main) |
| CD (deploy no GitHub Pages) | **skipped** (o `if:` do job bloqueou: evento é `pull_request`) |

Trecho do log do build na CI:
```
> npm run typecheck && node node_modules/vite/bin/vite.js build --configLoader runner
vite v7.3.6 building client environment for production...
✓ 1700 modules transformed.
✓ built in 3.65s
```
Observação: o aviso `Some chunks are larger than 500 kB` aparece no build, mas é só um alerta de desempenho e não falha a CI. Ficou fora do escopo da atividade.

**Problemas:** nenhum. A primeira execução real do workflow passou, o que também valida a sintaxe do YAML (que não pôde ser checada com actionlint localmente).

---

## Validação 2 — Push na main: CI → CD → aplicação publicada

**Ação manual (aluno):** merge do PR [FelipeKogake/Agenda#1](https://github.com/FelipeKogake/Agenda/pull/1) na `main` (commit de merge `63186df`).

Execução acompanhada pela IA: [CI/CD #3 — evento `push` na `main`](https://github.com/FelipeKogake/Agenda/actions/runs/42729602298).

| Job | Início → fim (UTC) | Resultado |
|---|---|---|
| CI (lint, testes e build) | 00:36:38 → 00:37:52 | success (desta vez o passo "Empacotar site" **rodou**) |
| CD (deploy no GitHub Pages) | 00:37:58 → 00:38:08 | success. Só começou **depois** do fim da CI (`needs: ci`) |

Trecho do log do deploy:
```
Creating Pages deployment with payload:
	"pages_build_version": "63186df36923e5cb1435698df233c20655f03857",
Created deployment for 63186df36923e5cb1435698df233c20655f03857
Reported success!
Evaluated environment url: https://felipekogake.github.io/Agenda/
```

**Problemas/observações:**
1. A IA tentou abrir o site publicado para conferir o hash no JavaScript, mas o ambiente da IA bloqueia esse host: `CONNECT tunnel failed, response 403 ... felipekogake.github.io:443 — connect_rejected`. A conferência visual da versão no site ficou com o aluno. **[PREENCHER: print do site mostrando "Versão 63186df"]**
2. O log do deploy mostra `DeprecationWarning: The punycode module is deprecated`. Vem de dentro da action `deploy-pages` e não afeta o resultado.
3. Na `main`, "Instalar dependências" levou ~53 s, sem aproveitar o cache criado no PR. Isso é esperado: o cache do GitHub Actions criado num PR não pode ser lido pela `main`. As próximas execuções na `main` usam o cache criado nesta.

---

## Validação 3 — Teste negativo: CI falha → CD não executa

**Prompt:** "Pronto, quebrei o teste na main, pode acompanhar"

**Alteração manual (aluno):** editou `src/version.test.ts` direto na `main` pelo GitHub, trocando o valor esperado por `'Versão QUEBRADA'`. Commit `eb1f406`, "Teste negativo: quebra teste de propósito".

Execução acompanhada pela IA: [CI/CD #4 — evento `push` na `main`](https://github.com/FelipeKogake/Agenda/actions/runs/42730398255). Conclusão: **failure**.

| Job / passo | Resultado |
|---|---|
| CI → Checkout, Node, Instalar dependências, Lint | success |
| CI → **Testes** | **failure** |
| CI → Build, Empacotar site | skipped (passos depois de uma falha não rodam) |
| **CD (deploy no GitHub Pages)** | **skipped**: `needs: ci` impediu o deploy |

Trecho do log da falha:
```
 ❯ src/version.test.ts (2 tests | 1 failed)
   × versão publicada > mostra o hash do commit e a data do build no formato brasileiro
     → expected 'Versão 0db2b2b · build 10/11/2026' to be 'Versão QUEBRADA' // Object.is equality
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 7 passed (8)
AssertionError: expected 'Versão 0db2b2b · build 10/11/2026' to be 'Versão QUEBRADA'
 ❯ src/version.test.ts:6:66
##[error]Process completed with exit code 1.
```

**Explicação (IA):** o Vitest terminou com código de saída 1, o GitHub Actions marcou o passo e o job `ci` como falhos, e o job `deploy`, que tem `needs: ci`, foi pulado. O site continua com a versão anterior (`63186df`). **[PREENCHER: print do site ainda mostrando "Versão 63186df"]**

Observação: desta vez "Instalar dependências" levou ~9 s (contra ~53 s na execução anterior), porque usou o cache do npm criado na `main` pela execução #3.

**Pendente:** o aluno desfaz a edição com outro commit na `main`, e a IA confirma que CI e CD voltam a ficar verdes.

---

<!-- As próximas interações (execuções no GitHub Actions, PR, merge, teste negativo) são acrescentadas abaixo conforme acontecem. -->
