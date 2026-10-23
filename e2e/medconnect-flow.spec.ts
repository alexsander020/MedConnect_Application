import { test, expect } from '@playwright/test';

test.describe('MedConnect E2E - Fluxo Completo Ponta a Ponta', () => {
  test('Fluxo completo: Paciente solicita cotação, Farmácia envia proposta, Paciente aprova e Farmácia entrega', async ({ browser }) => {
    // Estado compartilhado em memória
    const store = {
      patientLoggedIn: false,
      pharmacyLoggedIn: false,
      prescriptions: [] as any[],
      quotes: [] as any[],
      orders: [] as any[],
    };

    const patientUser = {
      id: 'patient-uuid-1',
      name: 'Maria Silva',
      email: 'paciente@medconnect.com',
      role: 'PATIENT',
      phone: '(11) 98765-4321',
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      cpf: '111.444.777-35',
    };

    const pharmacyUser = {
      id: 'pharmacy-uuid-1',
      name: 'Farmácia Arte & Manipulação',
      email: 'farmacia@medconnect.com',
      role: 'PHARMACY',
      cnpj: '12.345.678/0001-90',
      address: 'Rua Augusta, 500 - Consolação, São Paulo - SP',
      verified: true,
    };

    // Helper para configurar rotas de API interceptadas em cada contexto
    const setupApiRoutes = async (context: any, role: 'PATIENT' | 'PHARMACY') => {
      await context.route('**/api/**', async (route: any) => {
        const req = route.request();
        const url = new URL(req.url());
        const method = req.method();
        const path = url.pathname.replace(/^\/api/, '');

        // Sessão silenciosa (refresh token)
        if (path === '/auth/refresh') {
          if (role === 'PATIENT' && store.patientLoggedIn) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: patientUser,
                accessToken: 'jwt-token-for-patient',
                token: 'jwt-token-for-patient',
              }),
            });
          }
          if (role === 'PHARMACY' && store.pharmacyLoggedIn) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: pharmacyUser,
                accessToken: 'jwt-token-for-pharmacy',
                token: 'jwt-token-for-pharmacy',
              }),
            });
          }
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Nenhuma sessão ativa.' }),
          });
        }

        // Login
        if (path === '/auth/login' && method === 'POST') {
          const body = req.postDataJSON() || {};
          const isPharmacy = body.type === 'pharmacy' || body.email.includes('farmacia');
          if (isPharmacy) {
            store.pharmacyLoggedIn = true;
          } else {
            store.patientLoggedIn = true;
          }
          const user = isPharmacy ? pharmacyUser : patientUser;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user,
              accessToken: `jwt-token-for-${user.role.toLowerCase()}`,
              token: `jwt-token-for-${user.role.toLowerCase()}`,
            }),
          });
        }

        // Logout
        if (path === '/auth/logout' && method === 'POST') {
          if (role === 'PHARMACY') store.pharmacyLoggedIn = false;
          else store.patientLoggedIn = false;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Logout realizado com sucesso' }),
          });
        }

        // Farmácias parceiras (usado no Dashboard)
        if (path === '/pharmacies' && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([pharmacyUser]),
          });
        }

        // Prescriptions
        if (path === '/prescriptions' && method === 'POST') {
          const newPresc = {
            id: `presc-${Date.now()}`,
            patientId: patientUser.id,
            status: 'PENDING',
            notes: 'Fórmula personalizada: Minoxidil 5% + Biotina 5mg',
            location: 'São Paulo - SP',
            createdAt: new Date().toISOString(),
            patient: { anonymousId: 'Paciente Anônimo', id: patientUser.id },
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

        // Quotes
        if (path === '/quotes' && method === 'POST') {
          const body = req.postDataJSON() || {};
          const presc = store.prescriptions.find((p) => p.id === body.prescriptionId) || store.prescriptions[0];
          const newQuote = {
            id: `quote-${Date.now()}`,
            prescriptionId: presc ? presc.id : 'presc-1',
            pharmacyId: pharmacyUser.id,
            pharmacyName: pharmacyUser.name,
            pharmacy: { id: pharmacyUser.id, name: pharmacyUser.name },
            status: 'PENDING',
            price: Number(body.price),
            priceFormatted: Number(body.price).toFixed(2).replace('.', ','),
            deliveryDays: body.deliveryDays || 2,
            deliveryDaysText: `${body.deliveryDays || 2} dias úteis`,
            notes: body.notes || 'Matéria-prima de alta pureza',
            medicationsText: presc?.notes || 'Fórmula prescrita',
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

        // Orders
        if (path === '/orders' && method === 'POST') {
          const body = req.postDataJSON() || {};
          const quote = store.quotes.find((q) => q.id === body.quoteId) || store.quotes[0];
          const presc = store.prescriptions[0];
          const newOrder = {
            id: 'ord-98765432-abcd',
            quoteId: quote?.id || 'quote-1',
            patientId: patientUser.id,
            status: 'PRODUCTION',
            createdAt: new Date().toISOString(),
            quote: {
              ...quote,
              prescription: {
                ...presc,
                patient: patientUser,
              },
            },
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

        if (path.startsWith('/orders/') && path.endsWith('/status') && method === 'PATCH') {
          const parts = path.split('/');
          const orderId = parts[2];
          const body = req.postDataJSON() || {};
          const order = store.orders.find((o) => o.id === orderId) || store.orders[0];
          if (order) {
            order.status = body.status;
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(order),
          });
        }

        if (path.startsWith('/orders/') && method === 'GET') {
          const id = path.replace('/orders/', '');
          const order = store.orders.find((o) => o.id === id) || store.orders[0];
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(order || null),
          });
        }

        // Stats & Notificações
        if (path === '/pharmacy/stats' || path.startsWith('/pharmacy/stats')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              pendingQuotes: store.prescriptions.length,
              activeOrders: store.orders.filter((o) => o.status !== 'DELIVERED').length,
              completedOrders: store.orders.filter((o) => o.status === 'DELIVERED').length,
              monthlyRevenue: store.orders.reduce((acc, o) => acc + (o.quote?.price || 0), 0),
            }),
          });
        }

        if (path.startsWith('/notifications')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });
    };

    // ── DOIS CONTEXTOS DISTINTOS DE NAVEGADOR (Sessões isoladas) ──
    const patientContext = await browser.newContext();
    const pharmacyContext = await browser.newContext();

    await setupApiRoutes(patientContext, 'PATIENT');
    await setupApiRoutes(pharmacyContext, 'PHARMACY');

    const patientPage = await patientContext.newPage();
    const pharmacyPage = await pharmacyContext.newPage();

    // ─────────────────────────────────────────────────────────────
    // PASSO 1: Paciente faz login e envia receita para cotação
    // ─────────────────────────────────────────────────────────────
    await patientPage.goto('/MedConnect_Application/login');

    await patientPage.fill('input[type="email"]', 'paciente@medconnect.com');
    await patientPage.fill('input[type="password"]', 'SenhaForte#123');
    await patientPage.click('button[type="submit"]');

    await expect(patientPage).toHaveURL(/.*dashboard/);

    // Navega para solicitar nova cotação através da UI
    await patientPage.click('text=Nova Cotação');
    await expect(patientPage).toHaveURL(/.*new-quote/);

    // Preenche o formulário com anexo e observação médica
    await patientPage.setInputFiles('#gallery-upload', {
      name: 'receita_medica.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-bytes'),
    });

    await patientPage.fill(
      'textarea',
      'Fórmula personalizada: Minoxidil 5% + Biotina 5mg'
    );

    // Submete a cotação
    await patientPage.click('button:has-text("Solicitar Orçamento Agora")');

    // Verifica tela de confirmação de receita enviada
    await expect(patientPage.locator('text=Receita Enviada!')).toBeVisible();

    // ─────────────────────────────────────────────────────────────
    // PASSO 2: Farmácia visualiza solicitação e envia proposta
    // ─────────────────────────────────────────────────────────────
    await pharmacyPage.goto('/MedConnect_Application/login');

    // Seleciona aba da Farmácia
    await pharmacyPage.click('.glass-tab:has-text("Farmácia")');
    await pharmacyPage.fill('input[type="email"]', 'farmacia@medconnect.com');
    await pharmacyPage.fill('input[type="password"]', 'SenhaForte#123');
    await pharmacyPage.click('button[type="submit"]');

    // Deve redirecionar para a área da farmácia
    await expect(pharmacyPage).toHaveURL(/.*pharmacy/);

    // Farmácia acessa o mural de oportunidades / requisições
    await pharmacyPage.goto('/MedConnect_Application/pharmacy/requests');
    await expect(pharmacyPage.locator('text=NOVA')).toBeVisible();

    // Clica para enviar cotação
    await pharmacyPage.click('button:has-text("Enviar Cotação")');

    // Na tela de proposta, preenche valor, prazo e notas
    await expect(pharmacyPage).toHaveURL(/.*send-quote/);
    await pharmacyPage.fill('input[placeholder="Ex: 89,90"]', '45,00');
    await pharmacyPage.fill('input[placeholder="Ex: 2"]', '2');
    await pharmacyPage.fill(
      'textarea',
      'Matéria-prima pura com laudo e controle de qualidade.'
    );

    await pharmacyPage.click('button:has-text("Enviar Proposta ao Paciente")');
    await expect(pharmacyPage.locator('text=Proposta Enviada!')).toBeVisible();

    // ─────────────────────────────────────────────────────────────
    // PASSO 3: Paciente visualiza propostas e aprova a cotação
    // ─────────────────────────────────────────────────────────────
    await patientPage.goto('/MedConnect_Application/quote-offers');

    // Encontra a proposta da Farmácia Arte & Manipulação
    await expect(
      patientPage.locator('text=Farmácia Arte & Manipulação')
    ).toBeVisible();
    await expect(patientPage.locator('text=/R\\$\\s*45/')).toBeVisible();

    // Paciente aprova a proposta
    await patientPage.click('button:has-text("Aprovar Cotação e Fazer Pedido")');

    // Deve redirecionar para a tela de pedido ou exibir confirmação
    await expect(patientPage).toHaveURL(/.*order/);

    // ─────────────────────────────────────────────────────────────
    // PASSO 4: Farmácia gerencia o pedido até a entrega
    // ─────────────────────────────────────────────────────────────
    await pharmacyPage.goto('/MedConnect_Application/pharmacy/orders');

    // Pedido aparece em produção
    await expect(pharmacyPage.locator('.badge:has-text("Em Produção")')).toBeVisible();

    // Farmácia despacha para entrega (PRODUCTION -> DELIVERY)
    await pharmacyPage.click('button:has-text("Despachar para Entrega")');
    await expect(pharmacyPage.locator('.badge:has-text("Em Entrega")')).toBeVisible();

    // Farmácia confirma a entrega ao cliente (DELIVERY -> DELIVERED)
    await pharmacyPage.click('button:has-text("Confirmar Entrega")');

    // Pedido agora deve estar na aba de Concluídos
    await pharmacyPage.click('button:has-text("Concluídos")');
    await expect(pharmacyPage.locator('.badge:has-text("Finalizado")')).toBeVisible();

    // ─────────────────────────────────────────────────────────────
    // PASSO 5: Paciente verifica pedido finalizado em sua conta
    // ─────────────────────────────────────────────────────────────
    await patientPage.goto('/MedConnect_Application/orders');
    await patientPage.click('button:has-text("Concluídos")');
    await expect(patientPage.locator('.badge:has-text("Finalizado")')).toBeVisible();

    // Fecha contextos
    await patientContext.close();
    await pharmacyContext.close();
  });
});
