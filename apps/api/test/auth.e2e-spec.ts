import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Auth e2e Tests (Fase A)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. POST /auth/login com credenciais válidas deve retornar 200 e Set-Cookie com refreshToken', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.user).toMatchObject({
      email: 'ana@demo.bncc.br',
      name: 'Profª Ana Souza',
      role: 'PROFESSOR',
    });

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/refreshToken=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  it('2. POST /auth/login com senha incorreta deve retornar 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'senha_errada_123',
      })
      .expect(401);

    expect(response.body.message).toContain('Credenciais inválidas');
  });

  it('3. GET /auth/me sem token deve retornar 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('4. GET /auth/me com token Bearer válido deve retornar os dados do professor', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'marcos@demo.bncc.br',
        password: 'demo123',
      })
      .expect(200);

    const token = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body).toMatchObject({
      email: 'marcos@demo.bncc.br',
      name: 'Prof. Marcos Lima',
    });
  });

  it('5. POST /auth/refresh sem header CSRF deve retornar 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', ['refreshToken=teste'])
      .expect(403);
  });

  it('6. POST /auth/refresh com cookie válido e header CSRF deve renovar o token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      })
      .expect(200);

    const cookieHeader = loginRes.headers['set-cookie'];

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body.user.email).toBe('ana@demo.bncc.br');
    expect(refreshRes.headers['set-cookie']).toBeDefined();
  });

  it('7. POST /auth/logout com header CSRF deve limpar o cookie', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      })
      .expect(200);

    const cookieHeader = loginRes.headers['set-cookie'];

    const logoutRes = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieHeader)
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(200);

    expect(logoutRes.body.success).toBe(true);
    const cookies = logoutRes.headers['set-cookie'];
    expect(cookies[0]).toMatch(/refreshToken=;/);
  });
});
