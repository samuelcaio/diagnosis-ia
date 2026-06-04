# Diagnosis IA Clinical — Guia de Setup Completo

## Comandos para rodar o projeto

```bash
npx create-next-app@latest diagnosis-ia --typescript --tailwind --eslint --app --src-dir
cd diagnosis-ia
npm install prisma @prisma/client zod react-hook-form @hookform/resolvers
npm install jose bcryptjs lucide-react recharts
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-toast
npm install -D @types/bcryptjs
npx shadcn-ui@latest init
npx prisma init --datasource-provider sqlite
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## Simular login por role

| Role       | E-mail                    | Senha     |
|------------|---------------------------|-----------|
| Médico     | medico@clinica.com.br     | senha123  |
| Recepção   | recepcao@clinica.com.br   | senha123  |
| Admin      | admin@clinica.com.br      | senha123  |

## Onde substituir o mock pela IA/backend real

| Arquivo                              | O que substituir                          |
|--------------------------------------|-------------------------------------------|
| `src/app/api/ai-simulate/route.ts`   | Lógica mock → chamada OpenAI/HuggingFace  |
| `src/lib/prisma.ts`                  | SQLite → PostgreSQL (DATABASE_URL no .env)|
| `src/lib/auth.ts`                    | JWT local → NextAuth / Clerk              |
| `src/app/api/appointments/route.ts`  | Mock → queries Prisma reais               |

## Checklist de validação visual

- [ ] Login redireciona corretamente por role
- [ ] Sidebar colapsa em mobile
- [ ] Checklist salva dados no localStorage (dev) / banco (prod)
- [ ] Simulação IA retorna JSON com score + fatores
- [ ] Painel de chamada atualiza a cada 5s via setInterval
- [ ] Toast aparece em todas as ações
- [ ] Dark mode toggle funciona
- [ ] Admin só aparece para role=admin
