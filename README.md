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

## Área do membro e administração

- `/dashboard`: resumo da conta, conclusão do perfil, conexões, mídia, notificações, mensagens, publicações, plano atual e atalhos para as áreas da comunidade.
- `/admin`: painel restrito a administradores para acompanhar métricas, buscar usuários, suspender ou reativar contas, atribuir planos manualmente, editar catálogo e limites, e revisar denúncias.
- As permissões administrativas e o bloqueio de contas suspensas são verificados no banco. As operações privilegiadas deixam um registro interno de auditoria.
- O painel não processa pagamentos. Checkout e cobrança recorrente ainda precisam de integração com um gateway.
- O badge “Edit with Lovable” é ocultado no navegador, inclusive quando a hospedagem o injeta depois da página carregar.

## Lives com Tencent RTC

A rota `/live` usa o SDK Web oficial `trtc-sdk-v5` para vídeo/áudio em tempo real no cenário `live`: o apresentador entra como `anchor` e espectadores como `audience`. O chat da sala é persistido no Postgres e entregue em tempo real pelo Supabase Realtime, sujeito às políticas RLS. O `SDKSecretKey` nunca é incluído no bundle do navegador.

### Ativação

1. No console Tencent RTC, ative o serviço Live e confirme se o **SDKAppID `20048927`** corresponde ao aplicativo desta conta. A documentação aberta no navegador foi escrita para o UIKit Vue; este repositório React usa diretamente o SDK Web TRTC compatível com React.
2. No Supabase, aplique a migration `supabase/migrations/20261002061413_sintoniamora_realtime_tencent.sql` e faça deploy da Edge Function `tencentrctoken` com validação JWT habilitada.
3. Configure os segredos da Edge Function no Supabase, sem usar variáveis `VITE_` para credenciais privadas:

```sh
supabase secrets set TENCENT_SDK_APP_ID=20048927 TENCENT_SDK_SECRET_KEY='(defina no terminal seguro, não no repositório)' SINTONIAMORA_ALLOWED_ORIGINS='https://sintoniamora.netlify.app,https://sintoniamora.lovable.app'
supabase functions deploy tencentrctoken --project-ref jquujdxypjylvghyuqco
```

Adicione também a origem HTTPS usada pelo domínio de produção real. `SINTONIAMORA_ALLOWED_ORIGINS` é uma lista separada por vírgulas. A function exige sessão Supabase válida, valida acesso à live através de RLS e emite UserSig curto o bastante para uso de sessão, sem devolver a chave Tencent. Nunca cole o segredo em arquivo versionado, ticket, variável `VITE_*` ou console do navegador. Como a chave Tencent foi compartilhada em uma conversa, rotacione-a no console antes de produção e cadastre a nova apenas como segredo no Supabase.

### Funcionamento e limites conhecidos

- Apresentador precisa permitir câmera e microfone; navegador e site precisam suportar WebRTC, e produção deve usar HTTPS.
- O banco aplica RLS a criação/encerramento de salas e ao chat; somente o dono encerra a transmissão. Os eventos de sala e chat estão publicados no Supabase Realtime.
- Espectadores entram com papel `audience`, sem publicação de mídia, conforme as permissões do TRTC.
- O `SDKSecretKey` e `SDKAppID` ainda precisam ser confirmados/ativados no painel Tencent e os segredos configurados no Supabase. Até isso ocorrer, a Edge Function retorna configuração indisponível em vez de simular uma live.
