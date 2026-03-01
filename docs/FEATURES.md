# 🎯 Features & Funcionalidades - ZapRoute v2

Catálogo completo de todas as funcionalidades implementadas no sistema, casos de uso, fluxos de negócio e regras.

---

## 📌 Visão Geral

ZapRoute v2 é um sistema de gestão logística multi-tenant que oferece:

1. **Planejamento de Rotas** - Criação e otimização de rotas
2. **Rastreamento em Tempo Real** - Posição GPS do motorista
3. **Gerenciamento de Frota** - Veículos e manutenção
4. **Gestão de Motoristas** - Cadastro e performance
5. **Integração com IA** - Assistente inteligente Leônidas
6. **WhatsApp Integration** - Notificações automatizadas
7. **Relatórios e Analytics** - Dashboards e KPIs
8. **Multi-tenancy** - Isolamento de clientes SaaS
9. **Sistema de Segurança** - Autenticação e RBAC
10. **Admin/Backoffice** - Gerenciamento de plataforma
11. **Monitoramento Real-time** - Health checks e logs estruturados
12. **UX de Alta Fidelidade** - Skeleton loaders e segurança visual
11. **Monitoramento Real-time** - Health checks e logs estruturados
12. **UX de Alta Fidelidade** - Skeleton loaders e segurança visual

---

## 🗺️ Feature 1: Planejamento de Rotas

### Descrição
Permite criar, importar e otimizar rotas de entrega.

### Requisitos Funcionais

#### 1.1 Importação de Rotas (CSV)
**User Story:** Como operador, quero importar rotas de um arquivo CSV para não precisar cadastrar manualmente.

**Fluxo:**
1. Usuário acessa página "Planejador de Rotas"
2. Clica "Importar Rota"
3. Seleciona arquivo CSV com entregas
4. Sistema valida formato e dados
5. Mostra preview das entregas
6. Usuário confirma
7. Sistema cria rota com entregas

**Validações:**
- Arquivo deve ser CSV ou XLSX
- Colunas obrigatórias: orderId, customerName, address, latitude, longitude
- Dados devem estar completos
- Clientes devem existir no sistema

**Caso de Erro:**
```
Se cliente não existe:
- Parar importação
- Exibir mensagem: "Cliente XYZ não encontrado"
- Permitir criar cliente on-the-fly (opcional)
```

#### 1.2 Otimização de Rota
**User Story:** Como gerente, quero que o sistema otimize automaticamente a ordem de entregas para economizar tempo.

**Algoritmo:**
1. Pega todas as entregas da rota
2. Classifica por proximidade (nearest neighbor)
3. Calcula distância total estimada
4. Mostra no mapa
5. Permite reordenar manualmente

**Fórmula de Distância:**
```
Distância = √[(lat2-lat1)² + (lng2-lng1)²] * 111 km
(Aproximação usando graus como km)
```

#### 1.3 Atribuição de Motorista
**User Story:** Como operador, quero atribuir motoristas às rotas.

**Regras:**
- Motorista deve estar com status IDLE
- Motorista deve ter veículo atribuído
- Um motorista por rota
- Pode reatribuir até que rota comece

**Validações:**
- Motorista não pode estar em outra rota
- Veículo deve estar em status AVAILABLE
- Documento do motorista (CNH) deve estar válido

---

## 📍 Feature 2: Rastreamento em Tempo Real

### Descrição
Monitora a posição GPS e progresso de cada motorista em tempo real.

### Requisitos Funcionais

#### 2.1 Envio de Localização (App Motorista)
**User Story:** Como motorista, o app deve enviar minha localização a cada minuto.

**Fluxo:**
1. App motorista solicita permissão de GPS
2. A cada 60 segundos, envia localização
3. Sistema recebe e valida coordenadas
4. Armazena em `DriverJourneyEvent`
5. Atualiza mapa em tempo real (dashboard)

**Dados Enviados:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "accuracy": 5.5,
  "speed": 45.5,
  "heading": 90
}
```

**Validações:**
- Coordenadas devem estar dentro de um país
- Velocidade não pode ser > 300 km/h
- Accuracy deve ser < 100m para ser confiável

#### 2.2 Detecção de Chegada
**User Story:** Como sistema, devo detectar quando motorista chega em um ponto de entrega.

**Fluxo:**
1. Calcula distância entre motorista e próxima entrega
2. Se distância < 100 metros:
   - Envia notificação: "Chegou no destino"
   - Marca entrega como "NEAR_ARRIVAL"
   - Aguarda confirmação do motorista

#### 2.3 Dashboard de Rastreamento
**User Story:** Como gerente, quero ver todos os motoristas no mapa em tempo real.

**Funcionalidades:**
- Mapa Leaflet com marcadores de motoristas
- Cada marcador mostra:
  - Nome do motorista
  - Status (IDLE, BUSY)
  - Velocidade atual
  - Próxima entrega
- Clicar em motorista mostra:
  - Última localização
  - Rota planejada
  - Entregas completadas
  - Tempo estimado para fim

---

## 📦 Feature 3: Gerenciamento de Entregas

### Descrição
Controla o ciclo completo de cada entrega.

### Status de Entrega
```
PENDING
  ↓
IN_TRANSIT (Motorista saiu da base)
  ↓
DELIVERED (Confirmada no destino)
  ↓
CLOSED (Documentação completada)

OU

FAILED (Não conseguiu entregar)
  ↓
RETURNED (Retornou para base)
  ↓
CLOSED
```

### Requisitos Funcionais

#### 3.1 Confirmação de Entrega
**User Story:** Como motorista, quero confirmar quando entrego um pacote.

**Fluxo:**
1. Motorista chega no destino
2. Tira foto do cliente ou local
3. Coleta assinatura (digital)
4. Insere observações (opcional)
5. Confirma entrega
6. Sistema muda status para DELIVERED
7. Envia notificação ao cliente

**Dados Coletados:**
```json
{
  "deliveryId": "delivery-1",
  "photo": "base64-image",
  "signature": "base64-image",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "notes": "Entregue com sucesso",
  "timestamp": "2026-02-15T14:30:00Z"
}
```

#### 3.2 Registro de Falha
**User Story:** Como motorista, quero reportar quando não consigo fazer uma entrega.

**Fluxo:**
1. Motorista seleciona entrega
2. Clica "Não entregar"
3. Seleciona motivo:
   - Cliente não encontrado
   - Endereço incorreto
   - Pacote danificado
   - Cliente recusou
   - Outro
4. Adiciona foto/evidência
5. Insere observação
6. Confirma
7. Sistema cria OCCURRENCE
8. Rota continua ou retorna

#### 3.3 Historicidade
**User Story:** Como gerente, quero ver todo o histórico de uma entrega.

**Informações Mantidas:**
- Data/hora de criação
- Data/hora de entrega
- Motorista que entregou
- Fotos/assinatura
- Todas as alterações de status
- Incidentes relacionados

---

## 🚨 Feature 4: Gerenciamento de Incidentes

### Descrição
Registra e acompanha problemas ocorridos durante entregas.

### Tipos de Incidente
- DELIVERY_FAILURE - Não conseguiu entregar
- DAMAGED_PACKAGE - Pacote danificado
- INCORRECT_ADDRESS - Endereço errado
- CUSTOMER_NOT_FOUND - Cliente não encontrado
- WRONG_RECIPIENT - Destinatário errado
- SYSTEM_FAILURE - Falha do sistema

### Requisitos Funcionais

#### 4.1 Criação de Incidente
**User Story:** Como motorista, preciso reportar problemas durante o dia.

**Fluxo:**
1. Motorista toca "Reportar Problema"
2. Seleciona tipo de problema
3. Descreve situação
4. Tira foto(s) como evidência
5. Confirma
6. Sistema cria OCCURRENCE
7. Notifica gerente

#### 4.2 Acompanhamento de Incidente
**User Story:** Como gerente, quero acompanhar a resolução de incidentes.

**Fluxo:**
1. Gerente vê incidente aberto
2. Análisa fotos e descrição
3. Toma ação:
   - Reenviar entrega
   - Devolver ao cliente
   - Compensar cliente
4. Marca como resolvido

#### 4.3 Métricas de Incidentes
- Taxa de incidentes por motorista
- Incidentes por tipo
- Tempo médio de resolução

---

## 👥 Feature 5: Gerenciamento de Motoristas

### Descrição
Cadastro, monitoramento e avaliação de motoristas.

### Requisitos Funcionais

#### 5.1 Cadastro de Motorista
**User Story:** Como admin, quero cadastrar motoristas no sistema.

**Informações Coletadas:**
```
Nome, CPF, Email, Telefone
CNH, Categoria de CNH, Data de Vencimento da CNH
Avatar/Foto
```

**Validações:**
- CPF deve ser válido (formato)
- Email único por tenant
- Telefone obrigatório (para WhatsApp)
- CNH deve ter categoria válida (A, B, C, D, E)

#### 5.2 Avaliação de Motorista
**User Story:** Como sistema, devo calcular rating do motorista baseado em entregas.

**Fórmula:**
```
rating = (entregas_bem_sucedidas / total_entregas) * 5
         - (incidentes * 0.5)
         - (atrasos * 0.1)

Mínimo: 0.0 | Máximo: 5.0
```

**Exibição:**
- ⭐⭐⭐⭐⭐ 5.0 - Excelente
- ⭐⭐⭐⭐ 4.0 - Bom
- ⭐⭐⭐ 3.0 - Aceitável
- ⭐⭐ 2.0 - Ruim
- ⭐ 1.0 - Crítico

#### 5.3 Histórico de Rotas
**User Story:** Como gerente, quero ver todas as rotas que um motorista fez.

**Exibição:**
- Data
- Número de entregas
- Entregas bem-sucedidas
- Incidentes
- Distância total
- Tempo total
- Rating da rota

---

## 🚚 Feature 6: Gerenciamento de Frotas

### Descrição
Cadastro e manutenção de veículos.

### Requisitos Funcionais

#### 6.1 Cadastro de Veículo
**Informações:**
```
Placa (unique), Marca, Modelo, Ano
Tipo de Combustível
Capacidade de Peso (kg)
Capacidade de Volume (m³)
Quilometragem
Último Serviço
Próximo Serviço Agendado
```

#### 6.2 Registro de Manutenção
**Fluxo:**
1. Gerente registra manutenção realizada
2. Insere:
   - Tipo (Preventiva, Corretiva)
   - Descrição
   - Custo
   - Data
   - Próxima manutenção agendada
3. Sistema calcula próxima data automaticamente

**Regra:** Se próxima manutenção < 7 dias, enviar alerta

#### 6.3 Status do Veículo
- AVAILABLE - Pronto para rotas
- BUSY - Em rota
- MAINTENANCE - Em manutenção
- RETIRED - Fora de operação

**Validações:**
- Não pode iniciar rota se status != AVAILABLE
- Se manutenção vencer, mudar status para MAINTENANCE

---

## 🤖 Feature 7: Assistente de IA (Leônidas)

### Descrição
Chat com inteligência artificial usando Google Gemini.

### Requisitos Funcionais

#### 7.1 Chat Interativo
**User Story:** Como usuário, quero conversar com um assistente para tirar dúvidas.

**Funcionalidades:**
- Perguntas em linguagem natural
- Contexto da empresa (dados de rotas, entregas)
- Histórico de conversa
- Stream de resposta (escrita em tempo real)

**Exemplos de Perguntas:**
```
"Qual foi a taxa de sucesso esta semana?"
"Qual motorista teve melhor performance?"
"Otimize a rota RT-001"
"Qual é o custo médio de uma entrega?"
"Quais rotas tiveram problemas?"
```

#### 7.2 Análise de Rota
**User Story:** Como gerente, quero que a IA analise uma rota e sugira otimizações.

**Fluxo:**
1. Seleciona uma rota
2. Clica "Analisar com IA"
3. Sistema envia dados da rota para Gemini
4. IA retorna:
   - Análise da eficiência
   - Problemas identificados
   - Sugestões de otimização
   - Comparação com histórico

---

## 💬 Feature 8: WhatsApp Integration

### Descrição
Notificações e comunicação automatizada via WhatsApp Business.

### Requisitos Funcionais

#### 8.1 Notificações Automáticas
**Eventos que Disparam Notificação:**

| Evento | Mensagem | Destinatário |
|--------|----------|--------------|
| Rota Atribuída | "Nova rota RT-001 disponível" | Motorista |
| Chegou no Local | "Você chegou no destino" | Motorista |
| Entrega Confirmada | "Entrega confirmada!" | Cliente |
| Falha de Entrega | "Não conseguimos entregar" | Cliente |
| Rota Concluída | "Parabéns! Rota finalizada" | Motorista |

#### 8.2 Webhook de WhatsApp
**Fluxo:**
1. WhatsApp envia webhook para `/api/webhook/whatsapp`
2. Sistema processa evento
3. Atualiza status no BD
4. Exibe em dashboard

**Casos de Uso:**
- Motorista responde "Cheguei" → confirma entrega
- Cliente responde "Recebido" → confirma entrega
- Retentativas automáticas se erro

#### 8.3 Bot por Papel (Motorista, Supervisor, Vendedor, Cliente, Transportador)
O bot identifica o papel do remetente pelo telefone e aplica permissões específicas.

**Papéis Reconhecidos:**
- **Motorista**: cadastro de motorista (`driverType=OWN`)
- **Motorista Terceiro**: cadastro de motorista (`driverType=THIRD_PARTY`)
- **Vendedor**: cadastro de vendedor
- **Cliente**: cadastro de cliente
- **Supervisor**: telefone configurado no tenant
- **Transportador**: telefone configurado no tenant

**Configuração (tenant.config.whatsappRoles):**
```json
{
  "whatsappRoles": {
    "supervisorPhones": ["5511999999999"],
    "transporterPhones": ["5511888888888"]
  }
}
```

**Comandos por Papel (resumo):**

| Papel | Comandos principais |
|------|----------------------|
| Motorista | Início, Entrega, Falha, Pausa/Retomada, Resumo, Listar, Navegação, Contato, Sinistro, Jornada |
| Motorista Terceiro | Início, Entrega, Falha, Chegada/Descarga, Resumo, Listar, Sinistro, Atraso |
| Supervisor | Resumo geral, Listar pendentes, Status da nota, Detalhes da nota |
| Transportador | Resumo geral, Listar pendentes, Status da nota, Detalhes da nota |
| Vendedor | Status da nota, Detalhes da nota, Listar pendentes |
| Cliente | Status da nota, Detalhes da nota |

**Exemplos de mensagens:**
- "Status da nota 123" (Cliente/Vendedor/Supervisor/Transportador)
- "Entreguei a nota 123" (Motorista)
- "Resumo" (Motorista/Supervisor/Transportador)

---

## 📊 Feature 9: Dashboards e Relatórios

### Descrição
Visualização de dados e métricas de negócio.

### 9.1 Dashboard Operacional
**Métricas Exibidas:**
```
┌─────────────────────────────────────┐
│ Rotas Hoje: 5                       │
│ Entregas: 120                       │
│ Taxa de Sucesso: 96.5%              │
│ Motoristas Ativos: 8                │
└─────────────────────────────────────┘

Gráficos:
- Entregas por Dia (linha)
- Status das Rotas (pizza)
- Performance por Motorista (barras)
- Mapa com todos os motoristas
```

**Filtros:**
- Período (hoje, semana, mês, custom)
- Motorista específico
- Rota específica
- Status

### 9.2 Relatórios Executivos
**Relatórios Disponíveis:**
- Relatório Diário
- Relatório Semanal
- Relatório Mensal
- Relatório por Motorista
- Relatório por Cliente
- Análise de Custos

**Exportação:**
- PDF
- Excel
- Email programado

### 9.3 KPIs Principais
```
Taxa de Sucesso = Entregas Bem-sucedidas / Total * 100
Tempo Médio = Soma de Duração / Número de Rotas
Custo por Entrega = Despesas Totais / Total de Entregas
Taxa de Incidentes = Total Incidentes / Total Entregas * 100
```

---

## 🔐 Feature 10: Segurança e Autenticação

### Descrição
Sistema de acesso baseado em roles e permissões.

### Requisitos Funcionais

#### 10.1 Login
**Fluxo:**
1. Usuário insere email e senha
2. Sistema valida contra bcrypt hash
3. Se válido, gera JWT token (expires 24h)
4. Retorna token + dados do usuário
5. Cliente armazena em localStorage

#### 10.2 Roles e Permissões
```
SUPER_ADMIN
- Acesso a backoffice
- Gerenciamento de tenants
- Relatórios globais

ADMIN
- Gerenciamento de rotas
- Gerenciamento de motoristas
- Acesso a relatórios
- Configurações da conta

USER
- Visualizar rotas
- Visualizar motoristas
- Relatórios (leitura)

DRIVER
- Visualizar rotas próprias
- Atualizar localização
- Confirmar entregas
```

#### 10.3 Multi-tenancy
**Isolamento:**
- Cada usuário tem `tenantId`
- Todas as queries filtram por `tenantId`
- Usuário não pode acessar dados de outro tenant
- Admin não pode acessar dados de outro tenant

**Validação:**
```typescript
if (req.user.tenantId !== requestedTenantId) {
  throw new ForbiddenException();
}
```

---

## 🏢 Feature 11: Admin/Backoffice

### Descrição
Gerenciamento de plataforma SaaS.

### Requisitos Funcionais

#### 11.1 Gerenciamento de Tenants
**Operações:**
- Criar novo tenant
- Ativar/desativar tenant
- Suspender tenant
- Ver estatísticas do tenant
- Resetar dados do tenant (cuidado!)

#### 11.2 Auditoria
**Logs de Auditoria Registram:**
- Quem fez ação
- Qual ação (CREATE, UPDATE, DELETE, LOGIN)
- Qual entidade
- Dados antes/depois
- IP address
- Timestamp

**Retenção:** 90 dias

#### 11.3 Estatísticas Globais
- Total de tenants
- Total de rotas
- Total de entregas
- Taxa de sucesso global
- Motoristas mais produtivos
- Clientes mais ativos

---

## 📝 Feature 12: Gerenciamento de Clientes

### Descrição
Cadastro e histórico de clientes.

### Requisitos Funcionais

#### 12.1 Cadastro de Cliente
**Informações:**
```
Razão Social, Nome Fantasia
CNPJ, Inscrição Estadual
Email, Telefone, WhatsApp
Endereço completo (com CEP)
Localização (latitude/longitude)
Segmento (Retail, Wholesale, etc)
Limite de Crédito
Vendedor Responsável
```

#### 12.2 Importação de Clientes
**Formato CSV:**
```
legalName,tradeName,cnpj,email,phone,whatsapp,segment
Empresa 1,Shop 1,12345678000190,contato@example.com,1133334444,11999999999,RETAIL
```

#### 12.3 Histórico de Entregas
**Exibição:**
- Data
- Rota
- Motorista
- Status
- Observações

---

## 💰 Feature 13: Gerenciamento de Vendedores

### Descrição
Associação de vendedores a clientes.

### Requisitos Funcionais

#### 13.1 Cadastro de Vendedor
```
Nome, Email, Telefone
Status (ACTIVE, INACTIVE)
```

#### 13.2 Associação a Clientes
- Um vendedor pode ter múltiplos clientes
- Um cliente pode ter um vendedor
- Relatórios por vendedor

---

## 📱 Feature 14: App do Motorista

### Descrição
Aplicação móvel dedicada para motoristas.

### Requisitos Funcionais

#### 14.1 Visualização de Rota
- Mapa com todas as paradas
- Ordem otimizada
- Distância total
- Tempo estimado

#### 14.2 Confirmação de Entrega
- Foto
- Assinatura digital
- Observações
- Um clique para confirmar

#### 14.3 Notificações Push
- Nova rota atribuída
- Chegou no destino
- Rota prestes a expirar

---

## 🔄 Fluxos Principais

### Fluxo de Uma Rota (Completo)

```
1. PLANEJAMENTO
   - Importar entregas de CSV
   - Sistema otimiza rota
   - Gerente revisa e confirma

2. ATRIBUIÇÃO
   - Gerente atribui motorista
   - Gerente atribui veículo
   - Status muda para IN_PROGRESS

3. EXECUÇÃO
   - Motorista abre app
   - Motorista dirige para primeira parada
   - GPS envia localização cada minuto
   - Sistema detecta chegada
   - Motorista confirma entrega
   - Próxima parada

4. FINALIZAÇÃO
   - Todas as paradas confirmadas
   - Motorista retorna à base
   - Status muda para COMPLETED
   - Sistema gera relatório
   - Métricas atualizadas
```

---

## ✅ Regras de Negócio Críticas

1. **Uma rota não pode iniciar sem motorista e veículo**
2. **Motorista em rota não pode entrar em outra rota**
3. **Entrega só pode ser confirmada no local (GPS)**
4. **CNH expirada = motorista suspenso automaticamente**
5. **Incidente deve ser resolvido antes de encerrar rota**
6. **Dados de tenants isolados sempre**
7. **Audit log obrigatório em todas as mudanças**
8. **Backup automático diário**

---

**Última atualização:** 15 de fevereiro de 2026

---

## 📈 Feature 15: Monitoramento e Observabilidade

### Descrição
Garante a saúde do sistema e rastreamento proativo de erros.

### Requisitos Funcionais

#### 15.1 Health Checks Automáticos
- **Prisma:** Valida conexão com DB.
- **Redis:** Valida conexão com cache.
- **Endpoint:** Exposto em /api/health.

#### 15.2 Logging Estruturado
- **Formato:** JSON para logs de arquivo.
- **Rotação:** Diária para economia de disco.
- **Winston:** Implementação robusta com múltiplos níveis.

---

## ✨ Feature 16: Melhorias de UX e Visual Feedback

### Descrição
Padrões de interface para melhorar a fluidez e segurança operacional.

### Requisitos Funcionais

#### 16.1 Carregamento Estruturado (Skeletons)
- Skeletons em todas as tabelas e cards.
- Prevenção de "flicker" de layout.

#### 16.2 Segurança Visual (Diálogos)
- Diálogos de confirmação para todas as ações destrutivas.
- Feedback em tempo real no botão de ação (Loading Spinner).

---
