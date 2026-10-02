import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('BNCC Catalog e2e Tests (Fase A)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Obter token de autenticação da conta demo
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /bncc/habilidades sem token deve retornar 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/bncc/habilidades')
      .expect(401);
  });

  it('2. GET /bncc/habilidades com token deve listar todas as habilidades do catálogo', async () => {
    const response = await request(app.getHttpServer())
      .get('/bncc/habilidades')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('total');
    expect(response.body.total).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('3. GET /bncc/habilidades com filtro ano=1 deve retornar apenas habilidades do 1º ano', async () => {
    const response = await request(app.getHttpServer())
      .get('/bncc/habilidades?ano=1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.total).toBe(2);
    const codigos = response.body.data.map((h: any) => h.codigo);
    expect(codigos).toContain('EF01CO01');
    expect(codigos).toContain('EF01CO02');
  });

  it('4. GET /bncc/habilidades com busca textual search=hardware deve encontrar EF02CO04', async () => {
    const response = await request(app.getHttpServer())
      .get('/bncc/habilidades?search=hardware')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].codigo).toBe('EF02CO04');
  });

  it('5. GET /bncc/habilidades/:id com código canônico válido deve retornar o detalhe', async () => {
    const response = await request(app.getHttpServer())
      .get('/bncc/habilidades/EF01CO01')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.codigo).toBe('EF01CO01');
    expect(response.body.eixo).toBe('Pensamento Computacional (PC)');
    expect(response.body.descricao).toContain('Organizar objetos físicos');
  });

  it('6. GET /bncc/habilidades/:id com código inexistente deve retornar 404 Not Found', async () => {
    const response = await request(app.getHttpServer())
      .get('/bncc/habilidades/CODIGO_INEXISTENTE_999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.message).toContain('Habilidade não encontrada');
  });
});
