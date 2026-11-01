import { test, expect } from '@playwright/test';

test.describe('MedConnect E2E - Fluxo Veterinário Ponta a Ponta (Tutor & Farmácia)', () => {
  test('Fluxo completo: Tutor cadastra pet -> solicita cotação vet -> farmácia envia proposta -> tutor aprova', async ({ browser }) => {
    // Estado compartilhado em memória para o fluxo sintético
    const store = {
      tutorLoggedIn: false,
      pharmacyLoggedIn: false,
      animals: [] as any[],
      prescriptions: [] as any[],
      quotes: [] as any[],
      orders: [] as any[],
    };

    const tutorUser = {
      id: 'tutor-uuid-1',
      name: 'Carlos Oliveira (Tutor)',
      email: 'tutor@medconnect.com',
      role: 'PATIENT',
      phone: '(11) 98765-1122',
      address: 'Rua Bela Cintra, 200 - Consolação, São Paulo - SP',
      cpf: '222.333.444-55',
    };

    const pharmacyUser = {
      id: 'pharmacy-vet-1',
      name: 'Farmácia VetCare Manipulação',
      email: 'farmaciavet@medconnect.com',
      role: 'PHARMACY',
      cnpj: '98.765.432/0001-10',
      address: 'Av. Rebouças, 1500 - Pinheiros, São Paulo - SP',
      verified: true,
      hasVeterinaryCapability: true,
    };

    // Helper de interceptação de API
    const setupApiRoutes = async (context: any, role: 'TUTOR' | 'PHARMACY') => {
      await context.route('**/api/**', async (route: any) => {
        const req = route.request();
        const url = new URL(req.url());
        const method = req.method();
        const path = url.pathname.replace(/^\/api/, '');

        // 1. Configuração Pública com VET_ENABLED
        if (path === '/config' && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              vetEnabled: true,
              vetAllowFoodProducing: false,
              vetControlledEnabled: true,
            }),
          });
        }

        // 2. Auth Refresh
        if (path === '/auth/refresh') {
          if (role === 'TUTOR' && store.tutorLoggedIn) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: tutorUser,
                accessToken: 'jwt-token-tutor',
                token: 'jwt-token-tutor',
              }),
            });
          }
          if (role === 'PHARMACY' && store.pharmacyLoggedIn) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: pharmacyUser,
                accessToken: 'jwt-token-pharmacy',
                token: 'jwt-token-pharmacy',
              }),
            });
          }
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Nenhuma sessão ativa.' }),
          });
        }

        // 3. Login
        if (path === '/auth/login' && method === 'POST') {
          const body = req.postDataJSON() || {};
          const isPharmacy = body.type === 'pharmacy' || body.email.includes('farmacia');
          if (isPharmacy) {
            store.pharmacyLoggedIn = true;
          } else {
            store.tutorLoggedIn = true;
          }
          const user = isPharmacy ? pharmacyUser : tutorUser;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user,
              accessToken: `jwt-token-${user.role.toLowerCase()}`,
              token: `jwt-token-${user.role.toLowerCase()}`,
            }),
          });
        }

        // 4. Animals API
        if (path === '/animals' && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(store.animals),
          });
        }

        if (path === '/animals' && method === 'POST') {
          const body = req.postDataJSON() || {};
          const newAnimal = {
            id: `pet-${Date.now()}`,
            userId: tutorUser.id,
            name: body.name,
            species: body.species || 'DOG',
            breed: body.breed || 'Labrador',
            weightGrams: Number(body.weightGrams) || 15500,
            birthDate: body.birthDate || '2023-01-01T00:00:00.000Z',
            isFoodProducing: Boolean(body.isFoodProducing),
            notes: body.notes || 'Preferência sabor carne',
            createdAt: new Date().toISOString(),
          };
          store.animals.push(newAnimal);
          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newAnimal),
          });
        }

        // 5. Prescriptions
        if (path === '/prescriptions' && method === 'POST') {
          // Upload com multipart ou dados simulados
          const pet = store.animals[0] || { id: 'pet-1', name: 'Thor', species: 'DOG', weightGrams: 15500 };
          const newPresc = {
            id: `presc-vet-${Date.now()}`,
            patientId: tutorUser.id,
            status: 'PENDING',
            kind: 'VETERINARY',
            petId: pet.id,
            pet,
            prescriberName: 'Dra. Camila Nogueira',
            prescriberCrmv: '54321',
            prescriberUf: 'SP',
            vetDocumentType: 'MAGISTRAL',
            pharmaceuticalForm: 'BISCOITO_MEDICAMENTOSO',
            flavoring: 'Carne',
            notes: 'Fórmula veterinária manipulada em biscoito sabor carne',
            location: 'São Paulo - SP',
            createdAt: new Date().toISOString(),
            patient: { anonymousId: 'Tutor Anônimo', id: tutorUser.id },
            quotes: [],
          };
          store.prescriptions.push(newPresc);
          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newPresc),
          });
        }

        if (path === '/prescriptions/pharmacy' && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(store.prescriptions),
          });
        }

        if (path === '/prescriptions/my' && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(store.prescriptions),
          });
        }

        if (path.startsWith('/prescriptions/') && method === 'GET') {
          const id = path.replace('/prescriptions/', '');
          const presc = store.prescriptions.find((p) => p.id === id) || store.prescriptions[0];
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(presc || null),
          });
        }

        // 6. Quotes
        if (path === '/quotes' && method === 'POST') {
          const body = req.postDataJSON() || {};
          const presc = store.prescriptions.find((p) => p.id === body.prescriptionId) || store.prescriptions[0];
          const newQuote = {
            id: `quote-vet-${Date.now()}`,
            prescriptionId: presc ? presc.id : 'presc-vet-1',
            pharmacyId: pharmacyUser.id,
            pharmacyName: pharmacyUser.name,
            pharmacy: { id: pharmacyUser.id, name: pharmacyUser.name },
            status: 'PENDING',
            price: Number(body.price),
            priceFormatted: Number(body.price).toFixed(2).replace('.', ','),
            deliveryDays: body.deliveryDays || 3,
            deliveryDaysText: `${body.deliveryDays || 3} dias úteis`,
            notes: body.notes || 'Biscoito palatável sabor carne com laudo veterinário.',
            medicationsText: presc?.notes || 'Fórmula veterinária',
            createdAt: new Date().toISOString(),
          };
          store.quotes.push(newQuote);
          if (presc) {
            presc.quotes = [newQuote];
            presc.status = 'QUOTED';
          }
          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newQuote),
          });
        }

        // 7. Orders
        if (path === '/orders' && method === 'POST') {
          const body = req.postDataJSON() || {};
          const quote = store.quotes.find((q) => q.id === body.quoteId) || store.quotes[0];
          const presc = store.prescriptions[0];
          const newOrder = {
            id: 'ord-vet-12345678',
            quoteId: quote?.id || 'quote-vet-1',
            patientId: tutorUser.id,
            status: 'PRODUCTION',
            totalAmount: quote?.price || 65,
            deliveryAddress: tutorUser.address,
            prescription: presc,
            quote,
            createdAt: new Date().toISOString(),
          };
          store.orders.push(newOrder);
          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newOrder),
          });
        }

        if (path === '/orders/my' && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(store.orders),
          });
        }

        if (path.startsWith('/orders/') && method === 'GET') {
          const id = path.replace('/orders/', '');
          const ord = store.orders.find((o) => o.id === id) || store.orders[0];
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(ord || null),
          });
        }

        // Fallback default
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
    };

    // Criação dos 2 contextos de navegador
    const tutorContext = await browser.newContext();
    const pharmacyContext = await browser.newContext();

    await setupApiRoutes(tutorContext, 'TUTOR');
    await setupApiRoutes(pharmacyContext, 'PHARMACY');

    const tutorPage = await tutorContext.newPage();
    const pharmacyPage = await pharmacyContext.newPage();

    // ─────────────────────────────────────────────────────────────
    // PASSO 1: Tutor faz login e cadastra seu pet
    // ─────────────────────────────────────────────────────────────
    await tutorPage.goto('/MedConnect_Application/login');
    await tutorPage.fill('input[type="email"]', 'tutor@medconnect.com');
    await tutorPage.fill('input[type="password"]', 'SenhaTutor#123');
    await tutorPage.click('button[type="submit"]');

    await expect(tutorPage).toHaveURL(/.*dashboard/);

    // Tutor navega para Meus Pets
    await tutorPage.goto('/MedConnect_Application/my-pets');
    await expect(tutorPage.locator('text=Animais Cadastrados')).toBeVisible();

    // Abre modal para cadastrar pet
    await tutorPage.click('button:has-text("Cadastrar Pet")');
    await expect(tutorPage.locator('text=Novo Animal')).toBeVisible();

    await tutorPage.fill('input[placeholder*="Thor, Mel"]', 'Thor');
    await tutorPage.fill('input[placeholder*="Labrador"]', 'Golden Retriever');
    await tutorPage.fill('input[placeholder*="8.5"]', '15.5');
    await tutorPage.fill('textarea[placeholder*="Alérgico"]', 'Preferência sabor carne');

    // Salva o pet
    await tutorPage.click('button:has-text("Salvar Pet")');

    // Pet aparece na lista
    await expect(tutorPage.locator('text=Thor')).toBeVisible();
    await expect(tutorPage.getByText(/15[\.,]5\s*kg/)).toBeVisible();

    // ─────────────────────────────────────────────────────────────
    // PASSO 2: Tutor cria nova cotação veterinária para seu pet
    // ─────────────────────────────────────────────────────────────
    await tutorPage.goto('/MedConnect_Application/new-quote');
    await expect(tutorPage.locator('text=Orçamento 100% Gratuito')).toBeVisible();

    // Seletor "Para meu pet"
    await tutorPage.click('button:has-text("Para meu pet")');

    // Seleciona o pet recém-cadastrado
    await expect(tutorPage.locator('#pet-select option:has-text("Thor")')).toBeAttached();
    await tutorPage.locator('#pet-select').selectOption({ label: /Thor/ });

    // Preenche médico veterinário e CRMV
    await tutorPage.fill('input[placeholder*="Mariana Costa"]', 'Dra. Camila Nogueira');
    await tutorPage.fill('input[placeholder*="12345"]', '54321');

    // Anexa arquivo de receita
    await tutorPage.setInputFiles('#gallery-upload', {
      name: 'receita_veterinaria.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-vet-image-bytes'),
    });

    // Submete a cotação veterinária
    await tutorPage.click('button:has-text("Solicitar Orçamento Agora")');

    // Confirmação de envio
    await expect(tutorPage.locator('text=Receita Enviada!')).toBeVisible();

    // ─────────────────────────────────────────────────────────────
    // PASSO 3: Farmácia veterinária visualiza receita e envia proposta
    // ─────────────────────────────────────────────────────────────
    await pharmacyPage.goto('/MedConnect_Application/login');
    await pharmacyPage.click('.glass-tab:has-text("Farmácia")');
    await pharmacyPage.fill('input[type="email"]', 'farmaciavet@medconnect.com');
    await pharmacyPage.fill('input[type="password"]', 'SenhaForte#123');
    await pharmacyPage.click('button[type="submit"]');

    await expect(pharmacyPage).toHaveURL(/.*pharmacy/);

    // Farmácia acessa pedidos/requisições recebidas
    await pharmacyPage.goto('/MedConnect_Application/pharmacy/requests');
    await expect(pharmacyPage.locator('text=NOVA')).toBeVisible();

    // Clica para enviar cotação
    await pharmacyPage.click('button:has-text("Enviar Cotação")');

    await expect(pharmacyPage).toHaveURL(/.*send-quote/);
    await pharmacyPage.fill('input[placeholder="Ex: 89,90"]', '65,00');
    await pharmacyPage.fill('#delivery-days-input', '3');
    await pharmacyPage.fill('textarea', 'Biscoito medicamentoso palatável sabor carne com controle de qualidade.');

    await pharmacyPage.click('button:has-text("Enviar Proposta")');
    await expect(pharmacyPage.locator('text=Proposta Enviada!')).toBeVisible();

    // ─────────────────────────────────────────────────────────────
    // PASSO 4: Tutor visualiza cotações recebidas com selo Veterinário e aprova
    // ─────────────────────────────────────────────────────────────
    await tutorPage.goto('/MedConnect_Application/quote-offers');

    // Verifica selo "Veterinário" e dados do pet
    await expect(tutorPage.locator('text=Veterinário')).toBeVisible();
    await expect(tutorPage.locator('text=Farmácia VetCare Manipulação')).toBeVisible();
    await expect(tutorPage.getByText(/R\$\s*65/)).toBeVisible();

    // Tutor aprova a proposta
    await tutorPage.click('button:has-text("Aprovar Cotação e Fazer Pedido")');

    // Deve redirecionar para a tela de pedido com indicador veterinário
    await expect(tutorPage).toHaveURL(/.*order/);

    // Fecha contextos
    await tutorContext.close();
    await pharmacyContext.close();
  });
});

