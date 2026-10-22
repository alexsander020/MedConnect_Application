import { PrismaClient, Role, PrescriptionStatus, QuoteStatus, PharmacyVerificationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { encryptCpf, hashCpf, getCpfLastDigits } from '../src/lib/cpfCrypto';
import { ehCPFValido } from '@medconnect/validation';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERRO CRÍTICO: Execução de seed com dados sintéticos bloqueada em ambiente de produção (NODE_ENV=production).');
    process.exit(1);
  }

  console.log('🌱 Iniciando seed de dados sintéticos para MedConnect (PostgreSQL)...');

  // Senha padrão sintética para desenvolvimento
  const passwordHash = await bcrypt.hash('SenhaForte@123', 10);

  // 1. Criar Administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@medconnect.com.br' },
    update: {},
    create: {
      name: 'Administrador MedConnect',
      email: 'admin@medconnect.com.br',
      password: passwordHash,
      role: Role.ADMIN,
      phone: '11999990000',
      address: 'Sede Administrativa MedConnect - São Paulo, SP',
      emailVerified: true
    }
  });
  console.log(`👤 Admin registrado: ${admin.email}`);

  // 2. Criar 2 Pacientes com CPFs sintéticos válidos
  const cpfPaciente1 = '11144477735';
  const cpfPaciente2 = '10000000019';

  if (!ehCPFValido(cpfPaciente1) || !ehCPFValido(cpfPaciente2)) {
    throw new Error('CPFs sintéticos configurados no seed falharam na validação de dígitos verificadores!');
  }

  const paciente1 = await prisma.user.upsert({
    where: { email: 'carlos.paciente@exemplo.com.br' },
    update: {},
    create: {
      name: 'Carlos Alberto Silva (Sintético)',
      email: 'carlos.paciente@exemplo.com.br',
      password: passwordHash,
      role: Role.PATIENT,
      phone: '11988887777',
      address: 'Rua das Camélias, 102 - Jardim Paulista, São Paulo, SP',
      cpfEncrypted: encryptCpf(cpfPaciente1),
      cpfHash: hashCpf(cpfPaciente1),
      cpfLastDigits: getCpfLastDigits(cpfPaciente1),
      emailVerified: true
    }
  });

  const paciente2 = await prisma.user.upsert({
    where: { email: 'mariana.paciente@exemplo.com.br' },
    update: {},
    create: {
      name: 'Mariana Duarte Oliveira (Sintético)',
      email: 'mariana.paciente@exemplo.com.br',
      password: passwordHash,
      role: Role.PATIENT,
      phone: '11977776666',
      address: 'Av. Brigadeiro Faria Lima, 2500 - Itaim Bibi, São Paulo, SP',
      cpfEncrypted: encryptCpf(cpfPaciente2),
      cpfHash: hashCpf(cpfPaciente2),
      cpfLastDigits: getCpfLastDigits(cpfPaciente2),
      emailVerified: true
    }
  });
  console.log(`👥 Pacientes registrados: ${paciente1.email}, ${paciente2.email}`);

  // 3. Criar Farmácias Verificadas e Pendentes
  const farmacia1 = await prisma.pharmacy.upsert({
    where: { email: 'contato@farmaciavidaesaude.com.br' },
    update: {
      verified: true,
      verificationStatus: PharmacyVerificationStatus.VERIFIED
    },
    create: {
      name: 'Farmácia de Manipulação Vida & Saúde',
      email: 'contato@farmaciavidaesaude.com.br',
      password: passwordHash,
      cnpj: '12.345.678/0001-90',
      phone: '1133334444',
      address: 'Rua da Consolação, 1500 - Consolação, São Paulo, SP',
      deliveryArea: 'São Paulo, Guarulhos e Osasco',
      verified: true,
      verificationStatus: PharmacyVerificationStatus.VERIFIED,
      sanitaryLicense: 'CEVS-355030801-477-000123-1-2',
      operatingAuth: 'AFE-1.23456.7',
      technicalResponsibleName: 'Dra. Fernanda Alencar',
      technicalResponsibleCrf: 'CRF-SP 45.678',
      technicalResponsibleUf: 'SP',
      emailVerified: true
    }
  });

  const farmacia2 = await prisma.pharmacy.upsert({
    where: { email: 'atendimento@pharmabiomanipulacao.com.br' },
    update: {
      verified: true,
      verificationStatus: PharmacyVerificationStatus.VERIFIED
    },
    create: {
      name: 'PharmaBio Manipulações Especiais',
      email: 'atendimento@pharmabiomanipulacao.com.br',
      password: passwordHash,
      cnpj: '98.765.432/0001-10',
      phone: '1133335555',
      address: 'Av. Paulista, 1800 - Bela Vista, São Paulo, SP',
      deliveryArea: 'Toda a Região Metropolitana de São Paulo',
      verified: true,
      verificationStatus: PharmacyVerificationStatus.VERIFIED,
      sanitaryLicense: 'CEVS-355030801-477-000456-1-8',
      operatingAuth: 'AFE-1.98765.4',
      technicalResponsibleName: 'Dr. Roberto Meireles',
      technicalResponsibleCrf: 'CRF-SP 32.145',
      technicalResponsibleUf: 'SP',
      emailVerified: true
    }
  });

  const farmaciaPendente = await prisma.pharmacy.upsert({
    where: { email: 'nova@farmaciapendente.com.br' },
    update: {
      verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION,
      verified: false
    },
    create: {
      name: 'Farmácia Alquimia Viva (Aguardando Aprovação)',
      email: 'nova@farmaciapendente.com.br',
      password: passwordHash,
      cnpj: '33.444.555/0001-66',
      phone: '1133339999',
      address: 'Rua Augusta, 900 - Consolação, São Paulo, SP',
      deliveryArea: 'São Paulo Centro',
      verified: false,
      verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION,
      sanitaryLicense: 'CEVS-355030801-477-000789-1-0',
      operatingAuth: 'AFE-1.55555.5',
      technicalResponsibleName: 'Dra. Camila Nogueira',
      technicalResponsibleCrf: 'CRF-SP 55.432',
      technicalResponsibleUf: 'SP',
      documentUrl: 'https://storage.medconnect.com/docs/alquimia-viva-licenca.pdf',
      emailVerified: true
    }
  });

  console.log(`🏥 Farmácias registradas: ${farmacia1.name} (VERIFICADA), ${farmacia2.name} (VERIFICADA), ${farmaciaPendente.name} (PENDENTE)`);

  // 4. Criar Receitas de Exemplo
  let receita1 = await prisma.prescription.findFirst({
    where: { patientId: paciente1.id }
  });

  if (!receita1) {
    receita1 = await prisma.prescription.create({
      data: {
        patientId: paciente1.id,
        fileUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
        status: PrescriptionStatus.QUOTED
      }
    });
    console.log(`📄 Receita 1 criada para paciente 1 (${receita1.id})`);
  }

  let receita2 = await prisma.prescription.findFirst({
    where: { patientId: paciente2.id }
  });

  if (!receita2) {
    receita2 = await prisma.prescription.create({
      data: {
        patientId: paciente2.id,
        fileUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
        status: PrescriptionStatus.PENDING
      }
    });
    console.log(`📄 Receita 2 criada para paciente 2 (${receita2.id})`);
  }

  // 5. Criar Cotações de Exemplo para a Receita 1
  const existingQuote1 = await prisma.quote.findUnique({
    where: {
      prescriptionId_pharmacyId: {
        prescriptionId: receita1.id,
        pharmacyId: farmacia1.id
      }
    }
  });

  if (!existingQuote1) {
    await prisma.quote.create({
      data: {
        prescriptionId: receita1.id,
        pharmacyId: farmacia1.id,
        priceCents: 12550, // R$ 125,50
        deliveryDays: 2,
        notes: 'Fórmula em cápsulas vegetais com ativos padrão USP.',
        status: QuoteStatus.PENDING
      }
    });
    console.log(`💰 Cotação 1 registrada pela Farmácia 1 (R$ 125,50)`);
  }

  const existingQuote2 = await prisma.quote.findUnique({
    where: {
      prescriptionId_pharmacyId: {
        prescriptionId: receita1.id,
        pharmacyId: farmacia2.id
      }
    }
  });

  if (!existingQuote2) {
    await prisma.quote.create({
      data: {
        prescriptionId: receita1.id,
        pharmacyId: farmacia2.id,
        priceCents: 11000, // R$ 110,00
        deliveryDays: 3,
        notes: 'Frete grátis e embalagem hermética com proteção contra luz UV.',
        status: QuoteStatus.PENDING
      }
    });
    console.log(`💰 Cotação 2 registrada pela Farmácia 2 (R$ 110,00)`);
  }

  console.log('✅ Seed de dados sintéticos concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
