import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Plans Ownership & Privacy Isolation e2e Tests (Fase B)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenTeacher1: string;
  let tokenTeacher2: string;
  let teacher1PlanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Login Teacher 1: Profª Ana Souza
    const res1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'demo123' });
    tokenTeacher1 = res1.body.accessToken;

    // Login Teacher 2: Prof. Marcos Lima
    const res2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'marcos@demo.bncc.br', password: 'demo123' });
    tokenTeacher2 = res2.body.accessToken;

    // Obter habilidade
    const hab = await prisma.habilidade.findUnique({
      where: { codigo: 'EF01CO01' },
    });

    // Teacher 1 cria um plano
    const planRes = await request(app.getHttpServer())
      .post('/plans/generate')
      .set('Authorization', `Bearer ${tokenTeacher1}`)
      .send({
        habilidadeIds: [hab!.id],
        duracao: 50,
        recursosDigitais: false,
        instrucao: 'Plano confidencial da Profª Ana',
      });

    teacher1PlanId = planRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /plans para o Professor 1 deve listar seu próprio plano', async () => {
    const res = await request(app.getHttpServer())
      .get('/plans')
      .set('Authorization', `Bearer ${tokenTeacher1}`)
      .expect(200);

    const ids = res.body.data.map((p: any) => p.id);
    expect(ids).toContain(teacher1PlanId);
  });

  it('2. GET /plans/:id para o Professor 1 deve retornar os detalhes do seu plano', async () => {
    const res = await request(app.getHttpServer())
      .get(`/plans/${teacher1PlanId}`)
      .set('Authorization', `Bearer ${tokenTeacher1}`)
      .expect(200);

    expect(res.body.id).toBe(teacher1PlanId);
    expect(res.body.titulo).toBeDefined();
    expect(res.body.status).toBe('RASCUNHO');
  });

  it('3. PUT /plans/:id para o Professor 1 deve atualizar o plano com sucesso', async () => {
    const res = await request(app.getHttpServer())
      .put(`/plans/${teacher1PlanId}`)
      .set('Authorization', `Bearer ${tokenTeacher1}`)
      .send({
        titulo: 'Plano Atualizado da Profª Ana',
        markdownContent: '# Novo Conteúdo em Markdown...',
      })
      .expect(200);

    expect(res.body.titulo).toBe('Plano Atualizado da Profª Ana');
    expect(res.body.markdownContent).toBe('# Novo Conteúdo em Markdown...');
  });

  it('4. PUT /plans/:id com título vazio deve retornar 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .put(`/plans/${teacher1PlanId}`)
      .set('Authorization', `Bearer ${tokenTeacher1}`)
      .send({
        titulo: '   ',
        markdownContent: '# Conteúdo válido',
      })
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('título do plano não pode ficar em branco')]),
    );
  });

  it('5. GET /plans para o Professor 2 NUNCA deve listar o plano do Professor 1', async () => {
    const res = await request(app.getHttpServer())
      .get('/plans')
      .set('Authorization', `Bearer ${tokenTeacher2}`)
      .expect(200);

    const ids = res.body.data.map((p: any) => p.id);
    expect(ids).not.toContain(teacher1PlanId);
  });

  it('6. GET /plans/:id pelo Professor 2 para plano do Professor 1 DEVE retornar 404 Not Found (ocultar existência)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/plans/${teacher1PlanId}`)
      .set('Authorization', `Bearer ${tokenTeacher2}`)
      .expect(404);

    expect(res.body.message).toContain('Plano de aula não encontrado');
  });

  it('7. PUT /plans/:id pelo Professor 2 para plano do Professor 1 DEVE retornar 404 Not Found', async () => {
    const res = await request(app.getHttpServer())
      .put(`/plans/${teacher1PlanId}`)
      .set('Authorization', `Bearer ${tokenTeacher2}`)
      .send({
        titulo: 'Tentativa de alteração não autorizada',
        markdownContent: '# Invadindo...',
      })
      .expect(404);

    expect(res.body.message).toContain('Plano de aula não encontrado');
  });
});
