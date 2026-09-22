# Gestão de Centro Esportivo — API Backend

API REST para gestão de um centro esportivo: usuários, quadras, esportes, torneios, times e partidas, com autenticação JWT, autorização por papel, upload de regulamento, integração externa (clima e feriados) e regras de negócio de agendamento esportivo.

Projeto desenvolvido para a avaliação prática de Backend (documento `AV-11-CENTRO-ESPORTIVO.md`).

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Modelagem do domínio](#modelagem-do-domínio)
- [Perfis e matriz de permissões](#perfis-e-matriz-de-permissões)
- [Regras de negócio obrigatórias](#regras-de-negócio-obrigatórias)
- [Instalação e configuração](#instalação-e-configuração)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Execução](#execução)
- [Build de produção](#build-de-produção)
- [Testes automatizados](#testes-automatizados)
- [Upload de arquivo](#upload-de-arquivo)
- [Integração externa](#integração-externa)
- [Interceptor e tratamento de erros](#interceptor-e-tratamento-de-erros)
- [Endpoints](#endpoints)
- [Exemplos de requisição](#exemplos-de-requisição)
- [Decisões arquiteturais](#decisões-arquiteturais)

## Tecnologias

| Categoria | Tecnologia |
|---|---|
| Framework | NestJS 11 + TypeScript 5.7 |
| Banco de dados | PostgreSQL |
| ORM | Prisma 7.10.0 (`prisma.config.ts`, driver adapter `@prisma/adapter-pg`) |
| Autenticação | JWT (`@nestjs/jwt` + `passport-jwt`) |
| Validação | `class-validator` + `class-transformer` + `ValidationPipe` global |
| Upload | `multer` (via `@nestjs/platform-express`) |
| Integração externa | `@nestjs/axios` (`HttpService`) — BrasilAPI (feriados) e Open-Meteo (clima) |
| Segurança | Helmet, Compression, bcrypt |
| Testes | Jest + Supertest (testes e2e) |

## Arquitetura

```
src/
  main.ts                    # bootstrap: Helmet, Compression, ValidationPipe, Interceptor, Filter
  app.module.ts
  config/                    # ConfigService + validação de env (Joi)
  prisma/                    # PrismaService (driver adapter) + PrismaModule global
  common/
    decorators/               # @CurrentUser(), @Roles(), @Auth()
    guards/                    # JwtAuthGuard, RolesGuard
    interceptors/              # LoggingInterceptor
    filters/                   # HttpExceptionFilter
  auth/                       # registro, login, JwtStrategy
  users/                      # perfil próprio, listagem admin
  sports/                     # CRUD administrativo
  courts/                     # CRUD administrativo
  teams/                      # criação, membros, autorização de propriedade
  tournaments/                # CRUD, fluxo de estado, inscrição de times, upload
  matches/                    # criação, fluxo de estado, regras de agendamento
  external/                   # HolidaysService, WeatherService (HttpService)
```

Cada módulo de domínio segue o padrão Controller → Service → PrismaService, com DTOs validando entrada e autorização de propriedade implementada nos Services (não nos Controllers), mantendo a regra de negócio na camada correta.

## Modelagem do domínio

```
User (1) ---- (N) Team              [dono/capitão do time]
User (1) ---- (N) TeamMember        [membro de N times]
User (1) ---- (N) Tournament        [organizador]

Sport (1) ---- (N) Team
Sport (1) ---- (N) Tournament

Tournament (N) ---- (N) Team        via TournamentTeam (inscrição)
Team (1) ---- (N) TeamMember        [associativa User <-> Team, com papel]

Court (1) ---- (N) Match
Tournament (1) ---- (N) Match
Match (N) ---- (1) Team [teamA]
Match (N) ---- (1) Team [teamB]
```

Entidades: `User`, `Sport`, `Court`, `Team`, `TeamMember`, `Tournament`, `TournamentTeam` (associativa), `Match`. Schema completo em [`prisma/schema.prisma`](prisma/schema.prisma).

## Perfis e matriz de permissões

| Perfil | Descrição |
|---|---|
| `USER` | Usuário comum. Cria e gerencia seus próprios times, inscreve times em torneios. |
| `ORGANIZER` | Cria e gerencia torneios (próprios), cria partidas, lança resultados, envia regulamento. |
| `ADMIN` | Gestão total: usuários, esportes, quadras, e pode operar sobre qualquer recurso de terceiros. |

| Ação | USER | ORGANIZER | ADMIN |
|---|---|---|---|
| Consultar dados públicos (sports, courts, teams, tournaments, matches) | ✅ | ✅ | ✅ |
| Ver o próprio perfil (`/users/me`) | ✅ | ✅ | ✅ |
| Listar todos os usuários | ❌ | ❌ | ✅ |
| Criar/editar/excluir Sport, Court | ❌ | ❌ | ✅ |
| Criar Team | ✅ | ✅ | ✅ |
| Editar/excluir Team, gerenciar membros | Apenas dono | Apenas dono | ✅ (qualquer) |
| Criar/editar/excluir Tournament, mudar status | ❌ | Apenas organizador | ✅ (qualquer) |
| Enviar regulamento (upload) | ❌ | Apenas organizador | ✅ (qualquer) |
| Inscrever/desinscrever Team em Tournament | Apenas dono do time | ✅ (qualquer) | ✅ (qualquer) |
| Criar/editar/excluir Match, mudar status, lançar resultado | ❌ | Apenas organizador do torneio | ✅ (qualquer) |

A autorização acontece em duas camadas: **Guards** (`JwtAuthGuard` valida o token; `RolesGuard` valida o papel exigido pela rota) e **Service** (checagem de propriedade do recurso específico, ex.: `assertOwnerOrAdmin`, `assertOrganizerOrAdmin`). Isso impede que um usuário manipule recurso de terceiros apenas alterando um ID na URL — a identidade sempre vem do token JWT (`@CurrentUser()`), nunca de um parâmetro confiável do cliente.

## Regras de negócio obrigatórias

| Regra | Onde é aplicada | Status HTTP em violação |
|---|---|---|
| Quadra não recebe partidas sobrepostas | `MatchesService.assertNoCourtOverlap` (comparação de intervalos de horário) | 409 |
| Equipe não enfrenta a si mesma | `MatchesService.create` (`teamAId === teamBId`) | 409 |
| Resultado respeita o estado da partida | `MatchesService.setResult` (só aceita em `IN_PROGRESS`) | 409 |
| Referência a recurso inexistente | `findOne`/checagens de existência em todos os Services | 404 |
| Operação incompatível com estado atual | Máquinas de estado de `Tournament` e `Match` | 409 |
| Transições de status coerentes | `ALLOWED_TRANSITIONS` em `TournamentsService` e `MatchesService` | 409 |
| Dados sensíveis fora das respostas | `select` explícito em toda consulta de `User` (nunca inclui `passwordHash`) | — |
| Operações pessoais usam identidade autenticada | `@CurrentUser()` em vez de parâmetros de URL/body | — |

### Fluxo de estados

**Tournament**: `DRAFT → OPEN → IN_PROGRESS → FINISHED`, com `CANCELED` acessível a partir de `DRAFT`, `OPEN` ou `IN_PROGRESS`. Inscrição de times só é permitida com o torneio em `DRAFT` ou `OPEN`.

**Match**: `SCHEDULED → IN_PROGRESS → FINISHED`, com `CANCELED` acessível a partir de `SCHEDULED` ou `IN_PROGRESS`. O resultado só pode ser lançado com a partida em `IN_PROGRESS`, e o lançamento já transiciona automaticamente para `FINISHED`.

## Instalação e configuração

### Pré-requisitos

- Node.js 20+ (desenvolvido com Node 24)
- PostgreSQL (local ou remoto) já em execução
- npm

### Passos

```bash
git clone <url-do-repositorio>
cd avaliacao-Gestao_de_Centro_Esportivo
npm install
```

Copie o arquivo de exemplo de ambiente e preencha com seus dados reais:

```bash
cp .env.example .env
```

Edite `.env` com a `DATABASE_URL` do seu PostgreSQL local e um `JWT_SECRET` forte (mínimo 32 caracteres).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | Não (default `development`) | `development`, `production` ou `test` |
| `PORT` | Não (default `3000`) | Porta HTTP da aplicação |
| `DATABASE_URL` | **Sim** | Connection string do PostgreSQL (`postgresql://usuario:senha@host:porta/banco?schema=public`) |
| `JWT_SECRET` | **Sim** | Segredo de assinatura do JWT — mínimo 32 caracteres |
| `JWT_EXPIRES_IN` | Não (default `1d`) | Tempo de expiração do token |
| `UPLOAD_MAX_FILE_SIZE_MB` | Não (default `5`) | Tamanho máximo do upload de regulamento, em MB |
| `UPLOAD_DEST` | Não (default `./uploads`) | Diretório base de uploads |
| `EXTERNAL_API_TIMEOUT_MS` | Não (default `5000`) | Timeout das chamadas HTTP externas |
| `HOLIDAYS_API_URL` | Não (default BrasilAPI) | URL base da API de feriados |
| `WEATHER_API_URL` | Não (default Open-Meteo) | URL base da API de clima |
| `WEATHER_LATITUDE` / `WEATHER_LONGITUDE` | Não (default São Paulo) | Coordenadas usadas na consulta de clima |

A validação dessas variáveis acontece na inicialização via schema Joi ([`src/config/env.validation.ts`](src/config/env.validation.ts)) — a aplicação recusa subir se `DATABASE_URL` ou `JWT_SECRET` estiverem ausentes/inválidos, com mensagem de erro clara.

Nunca commite o arquivo `.env` real — ele está no `.gitignore`. Apenas `.env.example` é versionado.

## Banco de dados e migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

- `prisma generate`: gera o Prisma Client em `src/generated/prisma` (também fora do git).
- `prisma migrate deploy`: aplica as migrations existentes em `prisma/migrations/` sem gerar novas (uso em produção/CI). Durante desenvolvimento, para criar uma nova migration a partir de mudanças no `schema.prisma`, use `npx prisma migrate dev --name <descricao>`.

O schema usa **driver adapter** (`@prisma/adapter-pg`), configurado em [`prisma.config.ts`](prisma.config.ts) e consumido pelo [`PrismaService`](src/prisma/prisma.service.ts).

## Execução

```bash
npm run start:dev    # desenvolvimento, com watch
npm run start        # sem watch
npm run start:prod   # a partir do build compilado (dist/)
```

A aplicação inicia na porta definida em `PORT` (padrão `3000`).

## Build de produção

```bash
npm run build
npm run start:prod
```

`npm run build` compila `src/` para `dist/` via `tsc` (config em `tsconfig.build.json`), excluindo arquivos de teste e o `prisma.config.ts` (que roda via runtime próprio do Prisma CLI, não precisa ser compilado pelo Nest).

## Testes automatizados

Os testes end-to-end cobrem os 10 cenários obrigatórios da avaliação (fluxo de sucesso, 400, 401, 403, 404, 409, acesso a recurso de terceiro, upload válido/inválido, integração externa funcionando/falhando, fluxo completo de mudança de estado).

### Configuração necessária antes de rodar

Crie um banco de dados PostgreSQL dedicado para testes (separado do banco de desenvolvimento) e um arquivo `.env.test` na raiz do projeto:

```bash
# .env.test
NODE_ENV=test
PORT=3001
DATABASE_URL="postgresql://usuario:senha@localhost:5432/centro_esportivo_test?schema=public"
JWT_SECRET=um-segredo-de-pelo-menos-32-caracteres-para-teste
JWT_EXPIRES_IN=1d
UPLOAD_MAX_FILE_SIZE_MB=5
UPLOAD_DEST=./uploads
EXTERNAL_API_TIMEOUT_MS=5000
HOLIDAYS_API_URL=https://brasilapi.com.br/api/feriados/v1
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
WEATHER_LATITUDE=-23.5505
WEATHER_LONGITUDE=-46.6333
```

Aplique as migrations nesse banco:

```bash
DATABASE_URL="postgresql://usuario:senha@localhost:5432/centro_esportivo_test?schema=public" npx prisma migrate deploy
```

### Rodar os testes

```bash
npm run test:e2e
```

Os testes rodam sequencialmente (`--runInBand`), necessário porque compartilham um único banco de dados real — rodar em paralelo causa condições de corrida entre suítes. Um teste de integração externa consulta a BrasilAPI de verdade (requer conexão com a internet); os demais cenários de falha de integração usam um mock determinístico do `HttpService`, sem depender de rede.

| Arquivo | Cobre |
|---|---|
| `test/auth.e2e-spec.ts` | Fluxo de sucesso, 400, 401 |
| `test/authorization.e2e-spec.ts` | 403, acesso a recurso de terceiro |
| `test/errors.e2e-spec.ts` | 404, 409 |
| `test/upload.e2e-spec.ts` | Upload válido e inválido |
| `test/external-integration.e2e-spec.ts` | Integração externa ok e com falha controlada |
| `test/state-flow.e2e-spec.ts` | Fluxo completo de mudança de estado (Match e Tournament) |
| `test/business-rules.e2e-spec.ts` | Regras obrigatórias específicas (overlap de quadra, time contra si mesmo, time não inscrito) |

## Upload de arquivo

Upload de **regulamento em PDF**, conectado ao domínio `Tournament`.

- **Endpoint**: `POST /tournaments/:id/regulation`, `multipart/form-data`, campo `file`
- **Armazenamento**: disco local, em `uploads/regulations/`, com nome gerado (UUID + extensão) — o nome original do arquivo do usuário nunca é exposto no sistema de arquivos
- **Referência salva**: apenas o caminho relativo do arquivo é gravado no campo `regulationPath` do `Tournament`; o binário nunca vai para o banco
- **Tipos permitidos**: apenas `application/pdf` (validado por `fileFilter` do multer, antes mesmo de gravar em disco)
- **Tamanho máximo**: configurável via `UPLOAD_MAX_FILE_SIZE_MB` (padrão 5 MB) — arquivos maiores são rejeitados com `413 Payload Too Large` pelo próprio multer, sem chegar a ser gravados
- **Autorização**: apenas o organizador do torneio ou ADMIN

## Integração externa

Duas integrações via `HttpService`, ambas com timeout configurável e comportamento controlado em caso de falha (a API principal nunca fica indisponível por causa de um serviço externo fora do ar).

| Integração | Fonte | Endpoint conectado | Comportamento em falha |
|---|---|---|---|
| Feriados nacionais | [BrasilAPI](https://brasilapi.com.br/) | `GET /tournaments/:id/holiday-check` | Retorna `200` com `isHoliday: false, holiday: null` |
| Clima atual | [Open-Meteo](https://open-meteo.com/) | `GET /matches/:id/weather` | Retorna `200` com `weatherAvailable: false, currentWeather: null` |

**Limitação conhecida**: a Open-Meteo é consultada para o clima *atual* no momento da requisição, não uma previsão futura para a data/hora exata da partida — decisão consciente para manter a integração simples, já que previsão detalhada por data futura exigiria parâmetros adicionais fora do escopo da avaliação.

## Interceptor e tratamento de erros

- **`LoggingInterceptor`** ([`src/common/interceptors/logging.interceptor.ts`](src/common/interceptors/logging.interceptor.ts)): log estruturado de requisições bem-sucedidas — método, rota, status HTTP, tempo de execução em ms e identificador do usuário autenticado (ou `anônimo`). Não contém nenhuma regra de negócio, apenas observabilidade.
- **`HttpExceptionFilter`** ([`src/common/filters/http-exception.filter.ts`](src/common/filters/http-exception.filter.ts)): filtro global que padroniza toda resposta de erro (`message`, `statusCode`, `path`, `timestamp`) e loga a exceção — inclusive as barradas por Guards antes do Interceptor rodar (ex.: 401 por token ausente). Erros `5xx` são logados com stack trace completo no servidor; o cliente sempre recebe uma mensagem genérica, nunca detalhes internos.

Nenhuma resposta de erro inclui dados sensíveis (senha, hash, stack trace) — auditado sistematicamente nos módulos.

## Endpoints

Legenda de autenticação: **Público** (sem token) · **Auth** (qualquer usuário autenticado) · **ADMIN**/**ORGANIZER** (papel específico) · "e apenas o dono/organizador" indica checagem adicional de propriedade feita no Service.

### Auth

| Método | URL | Auth | Body | Respostas |
|---|---|---|---|---|
| POST | `/auth/register` | Público | `{ name, email, password }` | 201, 400, 409 (e-mail em uso) |
| POST | `/auth/login` | Público | `{ email, password }` | 200, 400, 401 (credenciais inválidas) |

### Users

| Método | URL | Auth | Body | Respostas |
|---|---|---|---|---|
| GET | `/users/me` | Auth | — | 200, 401 |
| GET | `/users` | ADMIN | — | 200, 401, 403 |

### Sports

| Método | URL | Auth | Body | Respostas |
|---|---|---|---|---|
| POST | `/sports` | ADMIN | `{ name }` | 201, 400, 401, 403, 409 (nome duplicado) |
| GET | `/sports` | Público | — | 200 |
| GET | `/sports/:id` | Público | — | 200, 404 |
| PATCH | `/sports/:id` | ADMIN | `{ name? }` | 200, 400, 401, 403, 404, 409 |
| DELETE | `/sports/:id` | ADMIN | — | 200, 401, 403, 404, 409 (times/torneios vinculados) |

### Courts

| Método | URL | Auth | Body | Respostas |
|---|---|---|---|---|
| POST | `/courts` | ADMIN | `{ name, location? }` | 201, 400, 401, 403 |
| GET | `/courts` | Público | — | 200 |
| GET | `/courts/:id` | Público | — | 200, 404 |
| PATCH | `/courts/:id` | ADMIN | `{ name?, location? }` | 200, 400, 401, 403, 404 |
| DELETE | `/courts/:id` | ADMIN | — | 200, 401, 403, 404, 409 (partidas vinculadas) |

### Teams

| Método | URL | Auth | Body | Respostas |
|---|---|---|---|---|
| POST | `/teams` | Auth | `{ name, sportId }` | 201, 400, 401, 404 (esporte), 409 (nome duplicado) |
| GET | `/teams` | Público | — | 200 |
| GET | `/teams/:id` | Público | — | 200, 404 |
| PATCH | `/teams/:id` | Auth, e apenas o dono ou ADMIN | `{ name? }` | 200, 400, 401, 403, 404 |
| DELETE | `/teams/:id` | Auth, e apenas o dono ou ADMIN | — | 200, 401, 403, 404, 409 (vínculos) |
| POST | `/teams/:id/members` | Auth, e apenas o dono ou ADMIN | `{ email }` | 201, 400, 401, 403, 404 (time ou usuário), 409 (já é membro) |
| DELETE | `/teams/:id/members/:userId` | Auth, e apenas o dono ou ADMIN | — | 200, 401, 403, 404, 409 (remover o dono) |

### Tournaments

| Método | URL | Auth | Body | Respostas |
|---|---|---|---|---|
| POST | `/tournaments` | ORGANIZER, ADMIN | `{ name, sportId, startDate, endDate }` | 201, 400, 401, 403, 404 (esporte), 409 (datas inválidas) |
| GET | `/tournaments` | Público | — | 200 |
| GET | `/tournaments/:id` | Público | — | 200, 404 |
| PATCH | `/tournaments/:id` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | `{ name?, startDate?, endDate? }` | 200, 400, 401, 403, 404, 409 |
| PATCH | `/tournaments/:id/status` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | `{ status }` | 200, 400, 401, 403, 404, 409 (transição inválida) |
| DELETE | `/tournaments/:id` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | — | 200, 401, 403, 404, 409 (partidas vinculadas) |
| POST | `/tournaments/:id/regulation` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | `multipart/form-data`, campo `file` (PDF) | 201, 400 (ausente/tipo errado), 401, 403, 404, 413 (tamanho excedido) |
| POST | `/tournaments/:id/teams` | Auth, e apenas dono do time/ORGANIZER/ADMIN | `{ teamId }` | 201, 400, 401, 403, 404, 409 (status/esporte/duplicado) |
| DELETE | `/tournaments/:id/teams/:teamId` | Auth, e apenas dono do time/ORGANIZER/ADMIN | — | 200, 401, 403, 404, 409 (status do torneio) |
| GET | `/tournaments/:id/holiday-check` | Público | — | 200, 404 |

### Matches

| Método | URL | Auth | Body | Respostas |
|---|---|---|---|---|
| POST | `/tournaments/:tournamentId/matches` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | `{ courtId, teamAId, teamBId, scheduledAt, durationMin? }` | 201, 400, 401, 403, 404, 409 (status/times iguais/não inscrito/overlap) |
| GET | `/tournaments/:tournamentId/matches` | Público | — | 200 |
| GET | `/matches?tournamentId=` | Público | — | 200 |
| GET | `/matches/:id` | Público | — | 200, 404 |
| PATCH | `/matches/:id` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | `{ courtId?, scheduledAt? }` | 200, 400, 401, 403, 404, 409 (estado/overlap) |
| PATCH | `/matches/:id/status` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | `{ status }` | 200, 400, 401, 403, 404, 409 (transição inválida) |
| PATCH | `/matches/:id/result` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | `{ scoreA, scoreB }` | 200, 400, 401, 403, 404, 409 (não está IN_PROGRESS) |
| DELETE | `/matches/:id` | ORGANIZER/ADMIN, e apenas o organizador ou ADMIN | — | 200, 401, 403, 404, 409 (não está SCHEDULED) |
| GET | `/matches/:id/weather` | Público | — | 200, 404 |

## Exemplos de requisição

### Registro e login

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Silva","email":"maria@example.com","password":"senhaSegura123"}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@example.com","password":"senhaSegura123"}'
```

Resposta (login):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "Maria Silva", "email": "maria@example.com", "role": "USER" }
}
```

### Criar um time (autenticado)

```bash
curl -X POST http://localhost:3000/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Time do Bairro","sportId":"<uuid-do-esporte>"}'
```

### Criar torneio (ORGANIZER/ADMIN)

```bash
curl -X POST http://localhost:3000/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Copa Futsal 2026","sportId":"<uuid>","startDate":"2027-01-01T10:00:00.000Z","endDate":"2027-01-10T18:00:00.000Z"}'
```

### Upload do regulamento

```bash
curl -X POST http://localhost:3000/tournaments/<id>/regulation \
  -H "Authorization: Bearer <token>" \
  -F "file=@regulamento.pdf;type=application/pdf"
```

### Tentativa de acesso a recurso de terceiro (403 esperado)

```bash
curl -X PATCH http://localhost:3000/teams/<id-de-outro-usuario> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Nome Alterado"}'
```
```json
{ "message": "Apenas o dono do time pode realizar esta operação.", "error": "Forbidden", "statusCode": 403 }
```

## Decisões arquiteturais

Decisões tomadas quando o documento da avaliação permitia mais de uma abordagem válida:

- **Team pertence a N Tournaments** (não a apenas um), via entidade associativa `TournamentTeam` com `@@unique([tournamentId, teamId])` — um time joga vários torneios ao longo do tempo, mas não se inscreve duas vezes no mesmo.
- **Sport é atributo próprio do Team**, não herdado do Tournament — a inscrição valida que `team.sportId === tournament.sportId`, rejeitando com 409 caso contrário.
- **Criador do Team vira automaticamente seu dono/capitão** (`TeamMember` com papel `CAPTAIN` criado na mesma transação de criação do time).
- **Upload conectado ao regulamento do Tournament** (PDF), em vez de imagem de Court — regulamento em PDF é a interpretação mais direta de "documento de torneio" e fácil de demonstrar.
- **Inscrição de Team em Tournament**: permitida apenas com o torneio em `DRAFT` ou `OPEN`; quem inscreve é o dono do time, ou qualquer ORGANIZER/ADMIN.
- **Criação de Match**: permitida apenas com o torneio em `OPEN` ou `IN_PROGRESS`, e apenas pelo organizador do torneio (ou ADMIN).
- **IDs como UUID** (`String @id @default(uuid())`), não inteiros sequenciais — dificulta enumeração de recursos por tentativa incremental.
- **Ambas as integrações externas** (clima e feriados) foram implementadas, não apenas uma — o documento permite escolher uma, mas as duas reaproveitam o mesmo padrão de `HttpService` + timeout + tratamento de falha, sem introduzir complexidade estrutural nova.
- **Exclusão (hard delete)** de entidades com vínculos (Sport, Court, Team, Tournament) é bloqueada pela constraint `ON DELETE RESTRICT` do banco, convertida para `409 Conflict` tratado na camada de aplicação (em vez de deixar estourar como erro 500 do driver do banco).
