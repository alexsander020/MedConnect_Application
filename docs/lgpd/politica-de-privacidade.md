# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Política de Privacidade e Proteção de Dados Pessoais — Plataforma MedConnect

> **AVISO LEGAL OBRIGATÓRIO:**
> Este documento é uma minuta/rascunho de natureza técnica e estrutural elaborado pela equipe de desenvolvimento de software da MedConnect. Os autores **NÃO são advogados**. Todas as cláusulas, bases legais sugeridas, compromissos de compartilhamento, direitos do titular e prazos de retenção aqui constantes devem passar por **REVISÃO E HOMOLOGAÇÃO JURÍDICA FORMAL** por advogado especializado em Direito Digital e Sanitário antes de publicação oficial aos usuários.

---

## 1. Apresentação e Quem Somos

A **MedConnect Intermediação de Serviços Farmacêuticos Ltda.** (sociedade em estruturação, doravante "MedConnect", "nós" ou "Plataforma"), tem como missão conectar pacientes a farmácias de manipulação legalmente regularizadas, simplificando o processo de cotação de receitas médicas, aceitação de propostas e acompanhamento da manipulação e entrega de medicamentos magistrais.

Reconhecemos a extrema sensibilidade das informações que você compartilha conosco, em especial **dados pessoais sobre sua saúde** contidos em receitas médicas. Esta Política explica com clareza como coletamos, usamos, armazenamos, compartilhamos e protegemos seus dados, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD).

---

## 2. Conceitos Importantes (Art. 5º da LGPD)

- **Titular**: Você, pessoa natural a quem se referem os dados pessoais que utilizam nossa plataforma (pacientes ou representantes de farmácias).
- **Dado Pessoal**: Qualquer informação relacionada a pessoa natural identificada ou identificável (ex: nome, CPF, e-mail, endereço).
- **Dado Pessoal Sensível**: Dado sobre saúde, vida sexual, dado genético ou biométrico, convicção religiosa, etc. No caso da MedConnect, as **receitas médicas** e os tratamentos nelas prescritos constituem dados pessoais sensíveis de saúde.
- **Controlador**: Pessoa física ou jurídica a quem competem as decisões sobre o tratamento de dados pessoais.
- **Operador**: Pessoa física ou jurídica que realiza o tratamento de dados em nome do controlador.
- **Encarregado (DPO)**: Canal de comunicação entre o controlador, os titulares e a Autoridade Nacional de Proteção de Dados (ANPD).

---

## 3. Dados que Coletamos e Suas Finalidades

### 3.1 Dados Cadastrais e de Identificação
- **Dados Coletados**: Nome completo, endereço de e-mail, número de telefone celular, endereço completo para entrega e CPF (criptografado em repouso).
- **Finalidade**: Criar e autenticar sua conta, viabilizar a entrega dos medicamentos manipulados em sua residência e emitir notas fiscais pela farmácia.
- **Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: Execução de contrato ou procedimentos preliminares (Art. 7º, V) e Cumprimento de obrigação legal/fiscal (Art. 7º, II).

### 3.2 Dados de Saúde (Receitas Médicas) — Dados Sensíveis
- **Dados Coletados**: Arquivo digitalizado ou foto da receita médica, nome do médico prescritor, registro no CRM, medicamentos, ativos, posologia e instruções de uso.
- **Finalidade**: Permitir que farmácias credenciadas avaliem a viabilidade técnica da manipulação, calculem o orçamento exato e manipulem o medicamento com base na prescrição.
- **Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: Consentimento específico e destacado do titular para finalidades determinadas (Art. 11, I) cumulado com a Tutela da Saúde (Art. 11, II, 'f').

> [!IMPORTANT]
> **PROIBIÇÃO DE COMERCIALIZAÇÃO**: A MedConnect **NUNCA vende, licencia ou comercializa dados de saúde** para indústrias farmacêuticas, empresas de marketing ou seguradoras. É terminantemente vedada qualquer prática contrária ao Art. 11, § 4º da LGPD.

### 3.3 Dados Técnicos de Navegação e Auditoria
- **Dados Coletados**: Endereço IP, data e hora de acessos, registros de downloads de receitas (`PrescriptionAccessLog`), histórico de alterações cadastrais e logs de segurança (`AuditLog`).
- **Finalidade**: Proteger a plataforma contra fraudes e invasões, cumprir a obrigação legal de guarda de logs de conexão e manter a rastreabilidade imutável de quem acessou cada prescrição.
- **Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: Cumprimento de obrigação legal (Marco Civil da Internet, Lei nº 12.965/2014, Art. 15) e Legítimo interesse de segurança (Art. 7º, IX).

---

## 4. Com Quem Compartilhamos Seus Dados

Seus dados são compartilhados apenas na medida estritamente necessária para a prestação dos serviços:

1. **Farmácias de Manipulação Credenciadas**:
   - **Na fase de cotação**: A farmácia acessa a receita médica para analisar a fórmula e fornecer o preço. O acesso é estritamente monitorado e registrado em auditoria.
   - **Após o aceite do orçamento**: A farmácia vencedora recebe seu nome, telefone e endereço para fins de rotulagem regulatória do medicamento, faturamento e entrega.
2. **Provedores de Infraestrutura e Tecnologia (Operadores)**:
   - Serviços de hospedagem em nuvem, bancos de dados em nuvem e provedores de envio de e-mails transacionais, todos vinculados a cláusulas contratuais rigorosas de sigilo e conformidade com a LGPD.
3. **Autoridades Governamentais e Regulatórias**:
   - ANVISA, Vigilâncias Sanitárias locais, Conselhos de Classe (CRF/CFM) e Poder Judiciário, mediante ordem judicial ou determinação legal expressa.

---

## 5. Medidas de Segurança e Criptografia da Informação

Adotamos padrões elevados de segurança da informação (Art. 46 da LGPD):
- **Criptografia em Repouso**: Campos altamente sensíveis como CPF, telefone e endereço residencial são armazenados criptografados via algoritmo **AES-256-GCM**, com chaves de 256 bits segregadas em variáveis protegidas e rotacionadas periodicamente.
- **Criptografia em Trânsito**: Todas as comunicações entre seu navegador e nossos servidores ocorrem sob protocolo criptográfico TLS 1.3 (HTTPS).
- **Trilha de Auditoria Imutável**: Criamos a tabela `AuditLog`, protegida contra alterações ou deleções, que documenta de forma indelével todos os acessos operacionais a prescrições e contatos de pacientes.
- **Controle de Acesso Baseado em Perfis (RBAC)**: Somente usuários devidamente autenticados e autorizados possuem acesso pontual aos dados indispensáveis para o exercício de suas funções.

---

## 6. Seus Direitos como Titular de Dados (Art. 18 da LGPD)

Você possui os seguintes direitos garantidos por lei, exercíveis diretamente no painel de configurações do seu perfil na plataforma:

1. **Confirmação e Acesso**: Saber se tratamos seus dados e quais dados possuímos a seu respeito.
2. **Exportação / Portabilidade (JSON)**: Obter uma cópia estruturada em formato interoperável (JSON) de todos os seus dados cadastrais, receitas enviadas e pedidos realizados via botão "Exportar Meus Dados".
3. **Correção de Dados**: Retificar dados incompletos, inexatos ou desatualizados nas opções da sua conta.
4. **Revogação do Consentimento**: Revogar a qualquer momento a autorização para tratamento dos seus dados de saúde por meio do painel de privacidade. A revogação bloqueia imediatamente novos envios de receitas.
5. **Eliminação e Anonimização**: Solicitar a exclusão definitiva ou a anonimização dos seus dados pessoais cadastrais.

> [!NOTE]
> **Ressalva de Conservação Sanitária e Legal `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**:
> Conforme o Artigo 16, I da LGPD, a MedConnect e as farmácias parceiras poderão ser obrigadas por lei a conservar determinadas informações (como cópias de receitas já dispensadas e notas fiscais de pedidos concluídos) pelo prazo mínimo de 5 (cinco) anos para atendimento à fiscalização sanitária da ANVISA (RDC 67/2007) e defesa em processos civis, mesmo após a solicitação de exclusão da conta.

---

## 7. Retenção e Descarte de Dados

Os dados pessoais serão conservados enquanto você mantiver uma conta ativa na MedConnect. Após o encerramento da conta:
- Dados cadastrais diretos serão anonimizados irreversivelmente;
- Logs de acesso ao sistema serão guardados pelo prazo mínimo de 6 meses (Marco Civil da Internet);
- Documentos fiscais e registros de fórmulas já dispensadas serão mantidos em arquivo seguro pelo prazo legal de 5 anos `[PENDENTE DE VALIDAÇÃO JURÍDICA]`, findo o qual serão destruídos com segurança.

---

## 8. Contato do Encarregado pelo Tratamento de Dados (DPO)

Para exercer seus direitos, esclarecer dúvidas sobre esta Política ou relatar qualquer preocupação de privacidade, entre em contato com nosso Encarregado de Dados:

- **Encarregado (DPO)**: [Nome a Designar]
- **E-mail de Contato**: `dpo@medconnect.com.br`
- **Endereço**: [Endereço da sede a preencher]

---

## 9. Atualizações desta Política

Esta Política de Privacidade poderá ser atualizada periodicamente para refletir melhorias no sistema ou exigências regulatórias da ANPD. Sempre que houver alteração material relevante, você será notificado com destaque em sua próxima visita à plataforma.

*Versão: 1.0.0 (Rascunho Técnico)*  
*Última atualização: 24 de Outubro de 2026*
