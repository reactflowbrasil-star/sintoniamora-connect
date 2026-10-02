# Sintoniamora Connect

crie uma plataforma de relacionamento Sintoniamora

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c4077ec4-da16-496c-8c2e-ad46e7b579ad).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Conectar autenticação, perfil e mídia

A aplicação usa Supabase Auth, Postgres e Storage. Crie um projeto Supabase para o Sintoniamora e configure no ambiente de build:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

A chave pública pode estar no cliente; nunca configure a `service_role` no frontend. No SQL Editor do Supabase, aplique `supabase/migrations/202610010001_sintoniamora_core.sql`. A migração cria as tabelas, políticas RLS, validação de maioridade, bucket privado e guarda de limites para fotos/vídeos no banco.

Rotas implementadas:

- `/cadastro`: cadastro 18+ com nome civil privado, nome de exibição, senha e aceite dos termos.
- `/entrar`: autenticação de e-mail e senha.
- `/perfil`: edição do perfil e upload/exclusão de fotos e vídeos. Limites Free são verificados pelo Postgres/Storage.

### Confirmação de e-mail no deploy Netlify

O domínio Netlify informado incorpora o app em `https://sintoniamora.lovable.app/`. O cadastro e a confirmação acontecem nessa origem interna. No Supabase, abra **Authentication → URL Configuration** e configure:

- **Site URL:** `https://sintoniamora.lovable.app`
- **Redirect URLs:** `https://sintoniamora.lovable.app/` e `http://localhost:3000/` para desenvolvimento local. O Netlify externo não precisa entrar na lista enquanto servir apenas como iframe.
- **Authentication → Email Templates → Confirm signup:** substitua o link de uso único por um código OTP e um link que apenas abre o formulário. Exemplo:

```html
<h2>Confirme seu e-mail no Sintoniamora</h2>
<p>Digite este código de 6 números no aplicativo:</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 8px">{{ .Token }}</p>
<p><a href="{{ .SiteURL }}/confirmar-email">Abrir confirmação de e-mail</a></p>
<p>Se você não criou esta conta, ignore esta mensagem.</p>
```

- Mantenha **Confirm email** ativado para exigir validação antes do primeiro login.

O app oferece `/confirmar-email` para verificar o código com o Supabase e criar a sessão. A confirmação por código evita que a pré-abertura automática de links por provedores de e-mail consuma o token antes da pessoa usuária. O callback por link continua suportado para mensagens já enviadas. Os redirecionamentos usados pelo cadastro e pelo reenvio precisam corresponder à lista autorizada no Supabase.

Rotas implementadas:

- `/cadastro`: cadastro 18+ com nome civil privado, nome de exibição, senha e aceite dos termos.
- `/confirmar-email`: validação do código OTP de seis dígitos e reenvio do código.
- `/entrar`: autenticação de e-mail e senha com reenvio de confirmação para contas ainda não verificadas.
- `/perfil`: edição do perfil e upload/exclusão de fotos e vídeos. Limites Free são verificados pelo Postgres/Storage.

Mensagens, feed, pagamentos recorrentes, assinatura Premium e administração ainda exigem módulos/backend próprios; não estão ativados por esta etapa.
