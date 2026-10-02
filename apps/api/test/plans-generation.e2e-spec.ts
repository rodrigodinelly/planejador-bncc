import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiRunStatus, PlanStatus } from '@prisma/client';

describe('Plans Generation & Transactional Integrity e2e Tests (Fase B)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let habilidadeId: string;

  beforeAll(async () => {
    process.env.N8N_MOCK_ENABLED = 'true';
    process.env.N8N_MOCK_MODE = 'true';
    process.env.N8N_MODE = 'mock';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Login com Profª Ana Souza
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      });
    authToken = loginRes.body.accessToken;

    // Buscar uma habilidade cadastrada no seed
    const habilidade = await prisma.habilidade.findUnique({
      where: { codigo: 'EF01CO01' },
    });
    habilidadeId = habilidade!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. POST /plans/generate com dados válidos deve criar AiRun SUCCEEDED e Plan RASCUNHO na mesma transação', async () => {
    const plansBeforeCount = await prisma.plan.count();

    const response = await request(app.getHttpServer())
      .post('/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        habilidadeIds: [habilidadeId],
        duracao: 50,
        recursosDigitais: false,
        instrucao: 'Criar atividade colaborativa desplugada.',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe(PlanStatus.RASCUNHO);
    expect(response.body.aiAssisted).toBe(true);
    expect(response.body.duracao).toBe(50);
    expect(response.body.habilidades).toHaveLength(1);
    expect(response.body.habilidades[0].codigo).toBe('EF01CO01');

    const aiRunId = response.body.aiRunId;
    expect(aiRunId).toBeDefined();

    // Verificar integridade no banco de dados
    const aiRunInDb = await prisma.aiRun.findUnique({
      where: { id: aiRunId },
    });
    expect(aiRunInDb).toBeDefined();
    expect(aiRunInDb!.status).toBe(AiRunStatus.SUCCEEDED);
    expect(aiRunInDb!.responsePayload).toBeDefined();

    const plansAfterCount = await prisma.plan.count();
    expect(plansAfterCount).toBe(plansBeforeCount + 1);
  });

  it('2. POST /plans/generate com duração inválida (zero) deve ser bloqueado com 400 Bad Request', async () => {
    const response = await request(app.getHttpServer())
      .post('/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        habilidadeIds: [habilidadeId],
        duracao: 0,
        recursosDigitais: false,
        instrucao: 'Instrução qualquer',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('maior que zero')]),
    );
  });

  it('3. POST /plans/generate sem habilidades selecionadas deve ser bloqueado com 400 Bad Request', async () => {
    const response = await request(app.getHttpServer())
      .post('/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        habilidadeIds: [],
        duracao: 50,
        recursosDigitais: false,
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('pelo menos uma habilidade')]),
    );
  });

  it('4. POST /plans/generate em caso de TIMEOUT da IA deve retornar 504 e NÃO criar nenhum plano no banco', async () => {
    const plansBefore = await prisma.plan.count();
    const aiRunsBefore = await prisma.aiRun.count();

    const response = await request(app.getHttpServer())
      .post('/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        habilidadeIds: [habilidadeId],
        duracao: 50,
        recursosDigitais: false,
        instrucao: 'Simular falha com __FORCE_TIMEOUT__',
      })
      .expect(504);

    expect(response.body.message).toContain('tempo limite de 60 segundos esgotado');

    // Confirmar que ZERO planos parciais foram criados
    const plansAfter = await prisma.plan.count();
    expect(plansAfter).toBe(plansBefore);

    // Confirmar que a execução da IA foi registrada como FAILED
    const aiRunsAfter = await prisma.aiRun.count();
    expect(aiRunsAfter).toBe(aiRunsBefore + 1);

    const latestAiRun = await prisma.aiRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    expect(latestAiRun!.status).toBe(AiRunStatus.FAILED);
    expect(latestAiRun!.errorMessage).toContain('tempo limite');
  });

  it('5. POST /plans/generate em caso de ERRO NO SERVIÇO da IA deve retornar 502 e NÃO criar plano', async () => {
    const plansBefore = await prisma.plan.count();

    const response = await request(app.getHttpServer())
      .post('/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        habilidadeIds: [habilidadeId],
        duracao: 45,
        recursosDigitais: true,
        instrucao: 'Simular erro com __FORCE_SERVICE_ERROR__',
      })
      .expect(502);

    expect(response.body.message).toContain('erro inesperado');

    const plansAfter = await prisma.plan.count();
    expect(plansAfter).toBe(plansBefore);
  });

  it('6. POST /plans/generate em caso de RESPOSTA INVÁLIDA da IA deve retornar 502 e NÃO criar plano', async () => {
    const plansBefore = await prisma.plan.count();
    const aiRunsBefore = await prisma.aiRun.count();

    const response = await request(app.getHttpServer())
      .post('/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        habilidadeIds: [habilidadeId],
        duracao: 45,
        recursosDigitais: true,
        instrucao: 'Simular resposta fora do contrato com __FORCE_INVALID_CONTRACT__',
      })
      .expect(502);

    expect(response.body.message).toContain('contrato de dados esperado');

    const plansAfter = await prisma.plan.count();
    expect(plansAfter).toBe(plansBefore);

    const aiRunsAfter = await prisma.aiRun.count();
    expect(aiRunsAfter).toBe(aiRunsBefore + 1);

    const latestAiRun = await prisma.aiRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    expect(latestAiRun!.status).toBe(AiRunStatus.FAILED);
    expect(latestAiRun!.errorMessage).toContain('contrato de dados esperado');
  });
});
