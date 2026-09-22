# Gestão de Centro Esportivo

Monorepo com o backend e (futuramente) o frontend do sistema de Gestão de Centro Esportivo.

## Estrutura

```
.
├── AV-11-CENTRO-ESPORTIVO.md   # documento de requisitos da avaliação
├── Backend/                    # API REST (NestJS + Prisma + PostgreSQL)
└── Frontend/                   # aplicação cliente (ainda não iniciada)
```

## Backend

API REST completa — autenticação, autorização por papel, gestão de esportes/quadras/times/torneios/partidas, upload de regulamento, integração externa e testes automatizados.

Ver documentação completa em [`Backend/README.md`](Backend/README.md).

Início rápido:

```bash
cd Backend
npm install
cp .env.example .env   # preencha com seus dados reais
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

## Frontend

Ainda não iniciado.

## Documento da avaliação

O arquivo [`AV-11-CENTRO-ESPORTIVO.md`](AV-11-CENTRO-ESPORTIVO.md) contém os requisitos oficiais da avaliação prática que orientou o desenvolvimento do Backend.
