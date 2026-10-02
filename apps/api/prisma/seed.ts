import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed idempotente do Planejador BNCC...');

  // 1. Contas de Demonstração
  const saltRounds = 10;
  const defaultPassword = process.env.DEMO_USER_PASSWORD || 'demo123';
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const demoUsers = [
    {
      email: 'ana@demo.bncc.br',
      name: 'Profª Ana Souza',
      role: 'PROFESSOR',
      passwordHash,
    },
    {
      email: 'marcos@demo.bncc.br',
      name: 'Prof. Marcos Lima',
      role: 'PROFESSOR',
      passwordHash,
    },
  ];

  for (const user of demoUsers) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash: user.passwordHash,
      },
      create: user,
    });
    console.log(`[Seed] Usuário processado: ${upserted.name} (${upserted.email})`);
  }

  // 2. Catálogo de Habilidades da BNCC
  const bnccFilePath = path.resolve(__dirname, '../../../docs/data/bncc-recorte.json');
  if (fs.existsSync(bnccFilePath)) {
    const rawData = fs.readFileSync(bnccFilePath, 'utf-8');
    const habilidades = JSON.parse(rawData);

    for (const item of habilidades) {
      const upsertedHabilidade = await prisma.habilidade.upsert({
        where: { codigo: item.codigo },
        update: {
          nivel: item.nivel,
          ano: item.ano,
          eixo: item.eixo,
          descricao: item.descricao,
          explicacao: item.explicacao || null,
          exemplos: item.exemplos || null,
        },
        create: {
          codigo: item.codigo,
          nivel: item.nivel,
          ano: item.ano,
          eixo: item.eixo,
          descricao: item.descricao,
          explicacao: item.explicacao || null,
          exemplos: item.exemplos || null,
        },
      });
      console.log(`[Seed] Habilidade processada: ${upsertedHabilidade.codigo} - ${upsertedHabilidade.eixo}`);
    }
  } else {
    console.warn(`[Seed] Arquivo de catálogo não encontrado em ${bnccFilePath}`);
  }

  console.log('Seed idempotente concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
