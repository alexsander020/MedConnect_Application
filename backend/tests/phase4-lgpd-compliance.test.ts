import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';
import {
  encryptField,
  decryptField,
  decryptFieldSafe,
  rotateEncryptedField,
  getCurrentKeyId,
  setCustomKeyring,
  isEncrypted
} from '../src/lib/fieldEncryption';
import { encryptCpf, decryptCpf, hashCpf } from '../src/lib/cpfCrypto';
import { ConsentService } from '../src/services/consentService';
import { AuditLogService } from '../src/services/auditLogService';
import { DataRetentionService } from '../src/services/dataRetentionService';
import { Role } from '@prisma/client';

describe('FASE 4 — LGPD E CONFORMIDADE (TESTES TÉCNICOS)', () => {
  const patientAId = 'paciente-lgpd-a-id';
  const patientBId = 'paciente-lgpd-b-id';
  const pharmacyId = 'farmacia-lgpd-id';
  const adminId = 'admin-lgpd-id';

  const patientAToken = jwt.sign(
    { id: patientAId, email: 'paciente.a@lgpd.test', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const patientBToken = jwt.sign(
    { id: patientBId, email: 'paciente.b@lgpd.test', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const pharmacyToken = jwt.sign(
    { id: pharmacyId, email: 'farmacia@lgpd.test', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const adminToken = jwt.sign(
    { id: adminId, email: 'admin@lgpd.test', role: 'ADMIN' },
    env.JWT_SECRET
  );

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // 1. Cria Paciente A
    await prisma.user.create({
      data: {
        id: patientAId,
        name: 'Carlos Titular de Dados',
        email: 'paciente.a@lgpd.test',
        password: 'Password123!',
        phone: encryptField('11988887777'),
        address: encryptField('Rua das Acácias, 123 - Jardins, São Paulo - SP'),
        cpfEncrypted: encryptCpf('11144477735'),
        cpfHash: hashCpf('11144477735'),
        cpfLastDigits: '35',
        role: 'PATIENT'
      }
    });

    // 2. Cria Paciente B
    await prisma.user.create({
      data: {
        id: patientBId,
        name: 'Ana Paciente B',
        email: 'paciente.b@lgpd.test',
        password: 'Password123!',
        phone: encryptField('21977776666'),
        address: encryptField('Av. Atlântica, 500 - Rio de Janeiro - RJ'),
        cpfEncrypted: encryptCpf('22255588846'),
        cpfHash: hashCpf('22255588846'),
        cpfLastDigits: '46',
        role: 'PATIENT'
      }
    });

    // 3. Cria Farmácia
    await prisma.pharmacy.create({
      data: {
        id: pharmacyId,
        name: 'Farmácia de Manipulação Eficácia',
        email: 'farmacia@lgpd.test',
        password: 'Password123!',
        cnpj: '11222333000181',
        verified: true,
        verificationStatus: 'VERIFIED'
      }
    });

    // 4. Cria Admin
    await prisma.user.create({
      data: {
        id: adminId,
        name: 'Admin Conformidade',
        email: 'admin@lgpd.test',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });
  });

  afterAll(async () => {
    setCustomKeyring(null);
    await cleanDatabase(prisma);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. CONSENTIMENTO OBRIGATÓRIO ANTES DO UPLOAD
  // ─────────────────────────────────────────────────────────────
  describe('4.2 Consentimento de Saúde (LGPD Art. 11)', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    it('Rejeita upload de receita quando o titular não possui consentimento ativo (403 CONSENT_REQUIRED)', async () => {
      // Paciente B não possui consentimento prévio e tenta enviar receita sem fornecer consentimento
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${patientBToken}`)
        .attach('file', validPdfBuffer, 'receita.pdf');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CONSENT_REQUIRED');
      expect(res.body.error.message).toMatch(/consentimento/i);
    });

    it('Aceita upload quando consentimento é registrado explicitamente no formulário de envio', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${patientBToken}`)
        .field('consent', 'true')
        .attach('file', validPdfBuffer, 'receita.pdf');

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();

      // Verifica se o consentimento foi registrado na tabela Consent
      const consentRecord = await prisma.consent.findFirst({
        where: { userId: patientBId, consentType: 'HEALTH_DATA_PROCESSING' }
      });
      expect(consentRecord).toBeDefined();
      expect(consentRecord?.textVersion).toBe('v1.0.0');
      expect(consentRecord?.revokedAt).toBeNull();
    });

    it('Permite revogação do consentimento nas configurações e bloqueia novos envios (403 CONSENT_REVOKED)', async () => {
      // 1. Registra consentimento para Paciente A
      await ConsentService.recordConsent({
        userId: patientAId,
        userType: Role.PATIENT,
        consentType: 'HEALTH_DATA_PROCESSING',
        ipAddress: '192.168.1.50'
      });

      // 2. Revoga o consentimento via endpoint POST /api/consent/revoke
      const revokeRes = await request(app)
        .post('/api/consent/revoke')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reason: 'Solicitado pelo titular nas configurações' });

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.status).toBe('CONSENT_REVOKED');

      // 3. Verifica no banco se o registro possui revokedAt e revokedIp
      const consentInDb = await prisma.consent.findFirst({
        where: { userId: patientAId, consentType: 'HEALTH_DATA_PROCESSING' },
        orderBy: { createdAt: 'desc' }
      });
      expect(consentInDb?.revokedAt).not.toBeNull();

      // 4. Tentativa de upload subsequente DEVE ser bloqueada
      const uploadRes = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${patientAToken}`)
        .field('consent', 'true')
        .attach('file', validPdfBuffer, 'nova-receita.pdf');

      expect(uploadRes.status).toBe(403);
      expect(uploadRes.body.error.code).toBe('CONSENT_REVOKED');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DIREITOS DO TITULAR: EXPORTAÇÃO E EXCLUSÃO / ANONIMIZAÇÃO
  // ─────────────────────────────────────────────────────────────
  describe('4.3 Direitos do Titular (LGPD Art. 18)', () => {
    it('Consulta termos vigentes, status de consentimento e registra opt-in via API (/api/consent)', async () => {
      // 1. Termos públicos
      const termsRes = await request(app).get('/api/consent/terms');
      expect(termsRes.status).toBe(200);
      expect(termsRes.body.currentHealthConsent).toBeDefined();

      // 2. Status inicial sem consentimento
      const statusBefore = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${patientAToken}`);
      expect(statusBefore.status).toBe(200);
      expect(statusBefore.body.hasActiveHealthConsent).toBe(false);

      // 3. Registra consentimento explícito via POST /api/consent
      const giveRes = await request(app)
        .post('/api/consent')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ consentType: 'HEALTH_DATA_PROCESSING' });
      expect(giveRes.status).toBe(201);
      expect(giveRes.body.success).toBe(true);

      // 4. Status após opt-in
      const statusAfter = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${patientAToken}`);
      expect(statusAfter.status).toBe(200);
      expect(statusAfter.body.hasActiveHealthConsent).toBe(true);
      expect(statusAfter.body.history.length).toBeGreaterThanOrEqual(1);
    });

    it('Exportação retorna todos os dados do titular em JSON (incluindo consentimentos, receitas, pedidos, avaliações e logs) e respeita Anti-IDOR', async () => {
      // Prepara histórico rico para Paciente A
      await ConsentService.recordConsent({
        userId: patientAId,
        userType: Role.PATIENT,
        consentType: 'HEALTH_DATA_PROCESSING',
        ipAddress: '127.0.0.1'
      });

      const presc = await prisma.prescription.create({
        data: {
          patientId: patientAId,
          fileUrl: 'local://receita-export.pdf',
          status: 'ACCEPTED'
        }
      });

      const quote = await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId,
          priceCents: 9900,
          status: 'ACCEPTED'
        }
      });

      const order = await prisma.order.create({
        data: {
          quoteId: quote.id,
          status: 'DELIVERED'
        }
      });

      await prisma.review.create({
        data: {
          orderId: order.id,
          patientId: patientAId,
          pharmacyId,
          rating: 5,
          comment: 'Ótimo atendimento'
        }
      });

      await prisma.prescriptionAccessLog.create({
        data: {
          prescriptionId: presc.id,
          accessedById: pharmacyId,
          accessedByType: Role.PHARMACY,
          ipAddress: '127.0.0.1'
        }
      });

      // 1. Paciente A exporta seus próprios dados
      const exportRes = await request(app)
        .get('/api/lgpd/export')
        .set('Authorization', `Bearer ${patientAToken}`);

      expect(exportRes.status).toBe(200);
      expect(exportRes.body.metadados).toBeDefined();
      expect(exportRes.body.metadados.titularId).toBe(patientAId);
      expect(exportRes.body.perfil.email).toBe('paciente.a@lgpd.test');
      expect(exportRes.body.perfil.telefone).toBe('11988887777');
      expect(exportRes.body.perfil.endereco).toBe('Rua das Acácias, 123 - Jardins, São Paulo - SP');
      expect(exportRes.body.perfil.cpfMascarado).toBe('***.***.***-35');
      expect(exportRes.body.consentimentos.length).toBe(1);
      expect(exportRes.body.receitasMedicas.length).toBe(1);
      expect(exportRes.body.receitasMedicas[0].pedidosAssociados.length).toBe(1);
      expect(exportRes.body.avaliacoes.length).toBe(1);
      expect(exportRes.body.trilhaAcessosReceitas.length).toBe(1);

      // 2. Tentativa de IDOR: Paciente B tenta exportar dados do Paciente A
      const idorRes = await request(app)
        .get(`/api/lgpd/export?userId=${patientAId}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      expect(idorRes.status).toBe(403);
      expect(idorRes.body.error.code).toBe('FORBIDDEN');

      // 3. Tentativa de IDOR na anonimização: Paciente B tenta excluir conta do Paciente A
      const idorDeleteRes = await request(app)
        .post('/api/lgpd/anonymize')
        .set('Authorization', `Bearer ${patientBToken}`)
        .send({ userId: patientAId });

      expect(idorDeleteRes.status).toBe(403);
      expect(idorDeleteRes.body.error.code).toBe('FORBIDDEN');
    });

    it('Exclusão / Anonimização remove identificadores diretos, revoga consentimento e preserva retenção mínima', async () => {
      // Cria uma receita pendente sem pedido (deve ser expurgada)
      const prescPending = await prisma.prescription.create({
        data: {
          patientId: patientAId,
          fileUrl: 'local://receita-para-anonimizar.pdf',
          status: 'PENDING'
        }
      });

      // Cria uma receita com pedido dispensado (deve ser retida por dever sanitário)
      const prescCompleted = await prisma.prescription.create({
        data: {
          patientId: patientAId,
          fileUrl: 'local://receita-retida-anvisa.pdf',
          status: 'ACCEPTED'
        }
      });
      const quote = await prisma.quote.create({
        data: {
          prescriptionId: prescCompleted.id,
          pharmacyId,
          priceCents: 5000,
          status: 'ACCEPTED'
        }
      });
      await prisma.order.create({
        data: {
          quoteId: quote.id,
          status: 'DELIVERED'
        }
      });

      // Solicita anonimização da conta
      const deleteRes = await request(app)
        .post('/api/lgpd/anonymize')
        .set('Authorization', `Bearer ${patientAToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.purgedFilesCount).toBe(1);
      expect(deleteRes.body.retainedRegulatoryCount).toBe(1);
      expect(deleteRes.body.retencaoRegulatoria).toBeDefined();
      expect(deleteRes.body.retencaoRegulatoria.avisoJuridico).toMatch(/PENDENTE DE VALIDAÇÃO JURÍDICA/i);

      // Segunda chamada para usuário já anonimizado retorna sucesso idempotente
      const secondDeleteRes = await request(app)
        .post('/api/lgpd/anonymize')
        .set('Authorization', `Bearer ${patientAToken}`);
      expect(secondDeleteRes.status).toBe(200);
      expect(secondDeleteRes.body.success).toBe(true);

      // Verifica dados no banco de dados: identificadores diretos devem estar nulos/anonimizados
      const anonymizedUser = await prisma.user.findUnique({ where: { id: patientAId } });
      expect(anonymizedUser).toBeDefined();
      expect(anonymizedUser?.name).toMatch(/Titular Anonimizado/i);
      expect(anonymizedUser?.email).toMatch(/^anonimizado_/);
      expect(anonymizedUser?.phone).toBeNull();
      expect(anonymizedUser?.address).toBeNull();
      expect(anonymizedUser?.cpfEncrypted).toBeNull();
      expect(anonymizedUser?.cpfHash).toBeNull();
      expect(anonymizedUser?.isAnonymized).toBe(true);
      expect(anonymizedUser?.anonymizedAt).not.toBeNull();

      // Receita sem pedido associado deve ter tido o ponteiro de arquivo limpo
      const updatedPresc = await prisma.prescription.findUnique({ where: { id: prescPending.id } });
      expect(updatedPresc?.status).toBe('CANCELLED');
      expect(updatedPresc?.fileUrl).toBe('ARQUIVO_EXPURGADO_EXCLUSAO_TITULAR');

      // Receita com pedido dispensado deve permanecer preservada
      const retainedPresc = await prisma.prescription.findUnique({ where: { id: prescCompleted.id } });
      expect(retainedPresc?.fileUrl).toBe('local://receita-retida-anvisa.pdf');
    });

    it('Retorna erro 500 caso usuário do token não exista na base ao exportar ou anonimizar', async () => {
      const ghostToken = jwt.sign(
        { id: 'ghost-user-id', email: 'ghost@lgpd.test', role: 'PATIENT' },
        env.JWT_SECRET
      );

      const exportGhost = await request(app)
        .get('/api/lgpd/export')
        .set('Authorization', `Bearer ${ghostToken}`);
      expect(exportGhost.status).toBe(500);

      const anonGhost = await request(app)
        .post('/api/lgpd/anonymize')
        .set('Authorization', `Bearer ${ghostToken}`);
      expect(anonGhost.status).toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. TRILHA DE AUDITORIA IMUTÁVEL
  // ─────────────────────────────────────────────────────────────
  describe('4.4 Trilha de Auditoria Imutável (AuditLog)', () => {
    it('AuditLog registra acessos a receitas e contatos e é consultável exclusivamente por ADMIN', async () => {
      // 1. Grava evento de teste na trilha de auditoria
      await AuditLogService.log({
        actorId: pharmacyId,
        actorType: Role.PHARMACY,
        actorEmail: 'farmacia@lgpd.test',
        action: 'VIEW_CONTACT_DATA',
        resource: 'Order',
        resourceId: 'order-123',
        reason: 'ORDER_DELIVERY_PREPARATION',
        ipAddress: '189.40.20.10'
      });

      // 2. Consulta por ADMIN deve retornar 200 com a lista de logs e suportar filtros
      const adminRes = await request(app)
        .get('/api/admin/audit-logs')
        .query({
          actorId: pharmacyId,
          action: 'VIEW_CONTACT_DATA',
          resource: 'Order',
          resourceId: 'order-123',
          startDate: new Date(Date.now() - 60000).toISOString(),
          endDate: new Date(Date.now() + 60000).toISOString(),
          page: 1,
          limit: 10
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(adminRes.body.logs)).toBe(true);

      const found = adminRes.body.logs.find((l: any) => l.action === 'VIEW_CONTACT_DATA');
      expect(found).toBeDefined();
      expect(found.actorId).toBe(pharmacyId);
      expect(found.reason).toBe('ORDER_DELIVERY_PREPARATION');

      // 3. Consulta por usuário comum (não admin) deve ser barrada (403 Forbidden)
      const patientRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${patientAToken}`);

      expect(patientRes.status).toBe(403);
    });

    it('AuditLog NÃO pode ser alterado nem apagado por nenhuma rota (405 Method Not Allowed)', async () => {
      const logRecord = await prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorType: Role.ADMIN,
          action: 'SECURITY_AUDIT_CHECK',
          resource: 'AuditLog',
          resourceId: 'log-imutavel-1',
          reason: 'TEST_IMMUTABILITY'
        }
      });

      // Tentativas de mutação em /api/admin/audit-logs
      const deleteAdminRes = await request(app)
        .delete(`/api/admin/audit-logs/${logRecord.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteAdminRes.status).toBe(405);

      const putAdminRes = await request(app)
        .put(`/api/admin/audit-logs/${logRecord.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'MUTATED_ACTION' });
      expect(putAdminRes.status).toBe(405);

      // Tentativas de mutação em /api/audit-logs
      const deletePublicRes = await request(app)
        .delete(`/api/audit-logs/${logRecord.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deletePublicRes.status).toBe(405);

      // Verifica que o registro permaneceu intacto no banco de dados
      const intact = await prisma.auditLog.findUnique({ where: { id: logRecord.id } });
      expect(intact).toBeDefined();
      expect(intact?.action).toBe('SECURITY_AUDIT_CHECK');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. CRIPTOGRAFIA EM REPOUSO E ROTAÇÃO DE CHAVES (keyId)
  // ─────────────────────────────────────────────────────────────
  describe('4.5 Criptografia em Repouso com keyId e Rotação', () => {
    it('Campos sensíveis (CPF, telefone, endereço) não aparecem em texto plano no banco de dados', async () => {
      const rawPhone = '11999994444';
      const rawAddress = 'Rua Secreta, 777 - Bairro Seguro, SP';
      const rawCpf = '12345678909';

      const res = await request(app)
        .post('/api/users')
        .send({
          name: 'Joana Criptografada',
          email: 'joana.crypto@test.com',
          password: 'Password123!',
          phone: rawPhone,
          address: rawAddress,
          cpf: rawCpf,
          healthConsent: true
        });

      expect(res.status).toBe(201);

      // Inspeciona diretamente a tabela no banco de dados (Prisma puro)
      const dbUser = await prisma.user.findUnique({ where: { email: 'joana.crypto@test.com' } });
      expect(dbUser).toBeDefined();

      // 1. CPF em repouso
      expect(dbUser?.cpfEncrypted).toBeDefined();
      expect(dbUser?.cpfEncrypted).not.toContain(rawCpf);
      expect(isEncrypted(dbUser?.cpfEncrypted)).toBe(true);

      // 2. Telefone em repouso
      expect(dbUser?.phone).toBeDefined();
      expect(dbUser?.phone).not.toContain(rawPhone);
      expect(isEncrypted(dbUser?.phone)).toBe(true);

      // 3. Endereço em repouso
      expect(dbUser?.address).toBeDefined();
      expect(dbUser?.address).not.toContain(rawAddress);
      expect(isEncrypted(dbUser?.address)).toBe(true);

      // 4. Descriptografia recupera o valor original íntegro
      expect(decryptField(dbUser!.phone!)).toBe(rawPhone);
      expect(decryptField(dbUser!.address!)).toBe(rawAddress);
      expect(decryptCpf(dbUser!.cpfEncrypted!)).toBe(rawCpf);
    });

    it('Suporta rotação de chave criptográfica rastreada por keyId', () => {
      // Configura keyring com chaves v1 e v2
      const keyring = {
        v1: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        v2: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'
      };
      setCustomKeyring(keyring, 'v1');

      const originalText = 'Dados altamente confidenciais de saúde do paciente';

      // 1. Criptografa sob a chave v1
      const encryptedV1 = encryptField(originalText, 'v1');
      expect(encryptedV1.startsWith('v1:')).toBe(true);
      expect(decryptField(encryptedV1)).toBe(originalText);

      // 2. Executa rotação para chave v2
      const rotation = rotateEncryptedField(encryptedV1, 'v2');
      expect(rotation.fromKeyId).toBe('v1');
      expect(rotation.toKeyId).toBe('v2');
      expect(rotation.rotatedValue.startsWith('v2:')).toBe(true);
      expect(rotation.rotatedValue).not.toBe(encryptedV1);

      // 3. Descriptografa com chave v2
      expect(decryptField(rotation.rotatedValue)).toBe(originalText);

      // Limpa keyring de teste
      setCustomKeyring(null);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. ROTINA DE RETENÇÃO / EXPURGO (DESATIVADA POR PADRÃO)
  // ─────────────────────────────────────────────────────────────
  describe('4.3 Rotina Agendada de Retenção / Expurgo', () => {
    it('Por padrão, a rotina de expurgo é desativada e não executa exclusões', async () => {
      expect(DataRetentionService.isEnabled()).toBe(false);

      const result = await DataRetentionService.runScheduledPurge();
      expect(result.executed).toBe(false);
      expect(result.reason).toMatch(/desativada por padrão/i);
    });

    it('Quando habilitada programaticamente, expurga tokens expirados e receitas canceladas antigas', async () => {
      const pastDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

      // Insere token expirado no banco
      await prisma.refreshToken.create({
        data: {
          tokenHash: 'expired-token-hash-123',
          familyId: 'family-1',
          userId: patientAId,
          expiresAt: pastDate
        }
      });

      // Insere receita cancelada antiga sem pedido
      const oldCancelledPresc = await prisma.prescription.create({
        data: {
          patientId: patientAId,
          fileUrl: 'local://old-cancelled.pdf',
          status: 'CANCELLED',
          createdAt: pastDate
        }
      });

      // Habilita temporariamente e executa ciclo completo de expurgo
      process.env.RETENTION_PURGE_ENABLED = 'true';
      const cycleResult = await DataRetentionService.runScheduledPurge();
      process.env.RETENTION_PURGE_ENABLED = 'false';

      expect(cycleResult.executed).toBe(true);
      expect(cycleResult.report?.expiredRefreshTokensPurged).toBeGreaterThanOrEqual(1);
      expect(cycleResult.report?.cancelledPrescriptionsPurged).toBeGreaterThanOrEqual(1);

      // Confirma remoção
      const foundToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: 'expired-token-hash-123' }
      });
      expect(foundToken).toBeNull();

      const foundPresc = await prisma.prescription.findUnique({
        where: { id: oldCancelledPresc.id }
      });
      expect(foundPresc).toBeNull();
    });
  });
});
