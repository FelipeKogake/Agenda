# Agenda da turma

Calendário mensal com tarefas, lições, trabalhos e eventos por turma. A leitura é pública (sem login); representantes e o super-admin autenticam para criar, editar e excluir atividades.

## Tecnologias

- React + TypeScript + Vite
- Firebase Authentication
- Cloud Firestore

## Configurar o Firebase

1. No Console do Firebase, abra **Authentication > Sign-in method** e habilite **E-mail/senha**.
2. Em **Authentication > Users**, crie uma conta para cada representante e para o super-admin, com e-mail e senha próprios. A senha é definida apenas no Firebase e nunca vai para o código ou para o Firestore.
3. Copie o UID de cada usuário.
4. No Firestore, crie a coleção `admins`. Para cada usuário, crie um documento cujo **ID seja o UID copiado**:
   - Representante (gerencia 1 turma só): `{ "role": "representante", "turmaId": "2° TECH D" }`
   - Super-admin (gerencia todas as turmas): `{ "role": "superadmin" }`
   - O valor de `turmaId` precisa ser **idêntico, caractere a caractere**, a um dos valores de [`src/classNames.ts`](src/classNames.ts) (copie e cole de lá em vez de digitar, para não errar acento/maiúscula). Se não bater, o app avisa o representante que a turma não foi reconhecida.
5. Publique as regras deste repositório com `firebase deploy --only firestore:rules` ou cole o conteúdo de [`firestore.rules`](firestore.rules) no Console do Firebase.

> Variáveis `VITE_*` são incorporadas ao JavaScript público. Por isso, nunca coloque senhas em `.env`, no Firestore ou nos secrets do GitHub. O site pede e-mail e senha, valida pelo Firebase Authentication e só libera o painel se o UID autenticado tiver um documento em `admins` com `role` igual a `representante` ou `superadmin`.

## Rodar localmente

```bash
npm install
npm run dev
```

O arquivo `.env.local` (baseado em `.env.example`) é opcional e serve só para sobrescrever a configuração pública do Firebase já embutida em `src/firebase.ts`.

## Estrutura dos dados

### `activities/{activityId}`

```json
{
  "title": "Prova de Matemática",
  "description": "Capítulos 3 a 5",
  "type": "trabalho",
  "date": "2026-09-25",
  "time": "14:00",
  "turmaId": "2° TECH D"
}
```

- `type`: `"tarefa"` | `"licao"` | `"trabalho"` | `"evento"`
- `date`: data específica no formato `YYYY-MM-DD`
- `time`: horário opcional no formato `HH:MM`, ou `null`

### `admins/{uid}`

Documento de permissão, criado manualmente pelo Console do Firebase — nunca pelo app.

```json
{ "role": "representante", "turmaId": "2° TECH D" }
```
ou
```json
{ "role": "superadmin" }
```

A lista de turmas é fixa em [`src/classNames.ts`](src/classNames.ts) — edite ali se as turmas mudarem.

## Comandos

```bash
npm run dev        # desenvolvimento
npm run test       # testes
npm run lint        # análise estática
npm run typecheck   # checagem de tipos
npm run build       # build de produção
```
