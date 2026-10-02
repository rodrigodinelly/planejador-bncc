-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('RASCUNHO');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'PROFESSOR',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "revokedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habilidades" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nivel" VARCHAR(100) NOT NULL,
    "ano" INTEGER,
    "eixo" VARCHAR(100) NOT NULL,
    "descricao" TEXT NOT NULL,
    "explicacao" TEXT,
    "exemplos" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habilidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "duracao" INTEGER NOT NULL,
    "recursosDigitais" BOOLEAN NOT NULL DEFAULT false,
    "instrucao" TEXT NOT NULL,
    "markdownContent" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'RASCUNHO',
    "aiAssisted" BOOLEAN NOT NULL DEFAULT true,
    "aiRunId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_habilidades" (
    "planId" UUID NOT NULL,
    "habilidadeId" UUID NOT NULL,

    CONSTRAINT "plan_habilidades_pkey" PRIMARY KEY ("planId","habilidadeId")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "AiRunStatus" NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(6),

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "habilidades_codigo_key" ON "habilidades"("codigo");

-- CreateIndex
CREATE INDEX "habilidades_nivel_ano_eixo_idx" ON "habilidades"("nivel", "ano", "eixo");

-- CreateIndex
CREATE UNIQUE INDEX "plans_aiRunId_key" ON "plans"("aiRunId");

-- CreateIndex
CREATE INDEX "plans_userId_updatedAt_idx" ON "plans"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_userId_status_idx" ON "ai_runs"("userId", "status");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "ai_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_habilidades" ADD CONSTRAINT "plan_habilidades_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_habilidades" ADD CONSTRAINT "plan_habilidades_habilidadeId_fkey" FOREIGN KEY ("habilidadeId") REFERENCES "habilidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
