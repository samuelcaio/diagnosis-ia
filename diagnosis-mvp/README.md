# Diagnosis IA Clinical — Guia Completo do MVP (Java + Supabase + React)

Você está diante de um MVP completo, seguro e funcional para a plataforma **Diagnosis**, projetado especificamente para testes reais de campo em Unidades Básicas de Saúde (UBS). 

O sistema integra conceitos modernos de segurança de dados em saúde, conformidade com a LGPD (anonimização por hash), trilhas de auditoria imutáveis (append-only), Row-Level Security (RLS) e apoio decisório clínico orientado por inteligência artificial explicável.

---

## 📂 Estrutura de Diretórios Gerada

```text
diagnosis-mvp/
├── backend/
│   ├── src/main/java/com/diagnosis/
│   │   ├── config/          # CORS, OpenApi (Swagger)
│   │   ├── controller/      # 17 endpoints REST mapeados
│   │   ├── dto/             # Objetos de Transferência (SOAP, login, triage)
│   │   ├── exception/       # Manipulação de erros global (@ControllerAdvice)
│   │   ├── model/           # Entidades JPA mapeadas (14 tabelas obrigatórias)
│   │   ├── repository/      # Interfaces JpaRepository
│   │   ├── security/        # Filtros e Provedores JWT (Spring Security stateless)
│   │   ├── service/         # Serviços principais (IA, PDF, CPF Hashing, RLS Binder)
│   │   └── utils/
│   ├── Dockerfile
│   ├── src/main/resources/application.properties
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/         # DashboardLayout (Sidebar responsiva e badge de perfil)
│   │   ├── pages/           # Telas do sistema (Timeline, SOAP, IA, Leitos, Relatórios, etc.)
│   │   ├── services/
│   │   ├── types/           # Interfaces TypeScript mapeadas com o Backend
│   │   ├── App.tsx          # Gerenciamento de rotas privadas e contexto
│   │   └── main.tsx
│   ├── index.html
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts       # Configuração de proxy reverso /api -> port 8080
│   └── tailwind.config.js
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Estruturas e gatilhos de log imutáveis
│   │   └── 002_rls_policies.sql    # Regras por linha de dados (Médicos, Enfermeiros, Recepção)
│   └── seed.sql                     # Semente de dados pré-carregados (João da Silva - Alto Risco)
├── docker-compose.yml               # Orquestrador local (DB + Backend + Frontend)
└── README.md
```

---

## ⚡ Como Executar Localmente em 1 Minuto (Modo Docker)

A infraestrutura foi totalmente conteinerizada para permitir a execução sem necessidade de instalações adicionais de Java, Maven, Node ou PostgreSQL na máquina host.

### Pré-requisitos
- Docker e Docker Compose instalados.

### Passos
1. Abra o terminal na raiz do diretório `diagnosis-mvp/`.
2. Execute o comando de subida:
   ```bash
   docker-compose up --build -d
   ```
3. O Docker irá compilar a imagem do Spring Boot, do React/Vite e levantar o banco PostgreSQL pré-carregando automaticamente os schemas de RLS e dados de simulação clínicos.

### Portas Ativas
- **Frontend (UI)**: [http://localhost:5173](http://localhost:5173)
- **Backend (API)**: [http://localhost:8080](http://localhost:8080)
- **Swagger / OpenAPI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Banco de Dados local**: `localhost:5432` (User: `postgres`, Pass: `postgres`, DB: `diagnosis`)

---

## 🔑 Credenciais Pré-configuradas para Teste Clínico

Para validar a integridade de telas e acessos por papéis (roles), utilize os profissionais de saúde pré-carregados no banco:

| Profissional | Role / Função | E-mail | Senha | Acessos e RLS |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Carlos Oliveira** | `DOCTOR` (Médico) | `medico@clinica.com.br` | `senha123` | PEP total, receitas, atestados, Sisreg, IA, controle de leitos, relatórios UBS. |
| **Enfª. Mariana Sousa** | `NURSE` (Enfermeira) | `enfermeira@clinica.com.br` | `senha123` | Triagem com classificação Manchester, fila de chamadas, evolução SOAP e leitos. |
| **Juliana Mendes** | `RECEPTIONIST` (Recepção) | `recepcao@clinica.com.br` | `senha123` | Agendamentos, preenchimento de dados de residência, ficha demográfica de paciente. |
| **Admin Diagnosis** | `ADMIN` (Administrador) | `admin@clinica.com.br` | `senha123` | Relatórios, leitos, auditoria imutável de acessos à LGPD. |

---

## 🛡️ Arquitetura de Segurança, LGPD e RLS

### 1. Anonimização de CPF (Art. 13 da LGPD)
O CPF do paciente **nunca** é salvo em texto plano. O backend realiza a criptografia gerando um hash criptográfico unilateral:
$$\text{CPF\_Hash} = \text{SHA-256}(\text{CPF\_Plano} + \text{Salt\_Interno\_UBS})$$
Ao pesquisar por CPF, o profissional digita o dado normal, o backend calcula o hash e realiza uma busca indexada instantânea por igualdade na tabela `patients`, protegendo a privacidade dos dados demográficos.

### 2. Logs de Auditoria Imutáveis
Toda ação crítica como consulta a prontuário, receitas geradas e diagnósticos de IA registram uma trilha na tabela `access_logs`. No arquivo `001_initial_schema.sql`, criamos um gatilho nativo SQL que dispara erros caso haja qualquer tentativa de atualização ou deleção:
```sql
CREATE TRIGGER trg_immutable_access_logs BEFORE UPDATE OR DELETE ON access_logs FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
```

### 3. Integração RLS NATIVA (Spring Boot + PostgreSQL/Supabase)
Cada requisição JWT autenticada no Spring Boot executa no início de sua transação JPA nativa a configuração das credenciais locais:
```sql
SET LOCAL app.current_user_role = 'DOCTOR';
SET LOCAL app.current_user_id = 'uuid-do-medico';
```
Com isso, as políticas de segurança RLS (`002_rls_policies.sql`) operam a nível de banco de dados, protegendo a UBS contra qualquer vazamento de dados ou invasão de rotas.

---

## 🏥 Como migrar e conectar ao Supabase Cloud (Produção)

Para implantar na UBS com banco de dados PostgreSQL real do Supabase:

1. Acesse o console do **Supabase** e crie um novo projeto.
2. Acesse a aba **SQL Editor** no Supabase e cole o conteúdo de:
   - `supabase/migrations/001_initial_schema.sql` (Executar primeiro)
   - `supabase/migrations/002_rls_policies.sql` (Executar segundo)
   - `supabase/seed.sql` (Executar para carregar os testes)
3. Na aba **Database Settings** do Supabase, copie a URL de conexão JDBC.
4. No arquivo `backend/src/main/resources/application.properties` (ou como variáveis de ambiente no container), altere as conexões:
   ```properties
   spring.datasource.url=jdbc:postgresql://<SEU-PROJETO-SUPABASE>.supabase.co:5432/postgres
   spring.datasource.username=postgres
   spring.datasource.password=<SUA-SENHA-DO-SUPABASE>
   ```
5. Reinicie a aplicação backend e tudo estará conectado de forma segura à nuvem!

---

## 🧬 Regra Cardiovascular do Motor de IA Explicação

O MVP inclui uma regra clínica cardiovascular. O paciente **João da Silva** (pré-cadastrado no seed) preenche todas as condições:
- **Idade superior a 50 anos** (Nascimento: 1965)
- **Dor Torácica Aguda ativa** (Observation: `CHEST_PAIN` = `SIM`)
- **Histórico de Diabetes ativa** (Condition: `E10` = `ACTIVE`)
- **Histórico de Hipertensão ativa** (Condition: `I10` = `ACTIVE`)

Ao entrar no prontuário de João da Silva e acionar o botão de **Análise Diagnóstica**, a inteligência retorna:
1. **Alerta**: Risco de Infarto Agudo do Miocárdio (IAM).
2. **Score de Probabilidade**: 92%.
3. **Fatores Explicados**: Diabetes (40%), Dor torácica (35%), Hipertensão (15%), Idade (10%).
4. **Exames de Confirmação**: ECG, Dosagem de Troponina, Ecocardiograma.
5. **Conduta Sugerida**: Administrar AAS 200mg mastigável imediatamente, monitorar sinais, obter ECG em até 10 minutos e providenciar leito ou transferência cardíaca.
