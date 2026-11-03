import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? 'root',
  password: process.env.DATABASE_PASSWORD ?? 'root',
  database: process.env.DATABASE_NAME ?? 'chamados',
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_TECNICO_EMAIL ?? 'tecnico@empresa.com';
  const senha = process.env.SEED_TECNICO_SENHA ?? 'Trocar@12345';

  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: 'Técnico Inicial',
      email,
      senhaHash: await bcrypt.hash(senha, 10),
      perfil: 'TECNICO',
    },
  });

  for (const nome of ['Rede', 'Impressora', 'Acesso a sistemas']) {
    await prisma.tipoProblema.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  console.log(`Seed concluído. Técnico inicial: ${email}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
