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

### Login social com Google

`/entrar` e `/cadastro` oferecem "Continuar com Google". O botão vai pelo `auth.signInWithOAuth` do supabase-js e o retorno entra por `completeAuthCallback`.

O projeto responde com `response_type=code` (PKCE), não com tokens no fragmento como nos links de confirmação por e-mail. Por isso o hand-off usa um cliente supabase-js separado: ele deriva o `code_challenge` e guarda o verifier entre o redirecionamento e o retorno. A sessão que vem dele é copiada para `sintoniamora.auth.v1`, que continua sendo a única fonte que o resto do app lê. Não implementei a troca em `/auth/v1/token?grant_type=pkce` à mão porque esse contrato não faz parte da superfície documentada e o endpoint rejeitou as três formas de parâmetro testadas.

**Para contas novas o passo 1 da lista abaixo é obrigatório:** sem a migração, o gatilho `create_sintoniamora_member` rejeita a conta social, porque exige uma data de nascimento que o Google não envia. A tela passa a mostrar um aviso explícito nesse caso.

Para habilitar, são três passos que **não** são feitos pelo código:

1. Aplique `supabase/migrations/20261003010000_google_auth.sql` no SQL Editor. Ela adapta o gatilho `create_sintoniamora_member`, que exigia `birth_date` e `terms_accepted` — campos que o Google nunca envia — e cria a RPC `complete_member_registration`.
2. No Supabase, em **Authentication → Providers → Google**, ative o provedor com o Client ID e o Client Secret gerados no Google Cloud (OAuth 2.0, tipo "Web application"). Sem isso a API responde `Unsupported provider: provider is not enabled`.
3. Em **Authentication → URL Configuration**, acrescente as URLs de retorno, por exemplo `https://SEU-DOMINIO/entrar` e `http://localhost:8083/entrar`. É para onde o Supabase devolve a sessão depois do login social.

Como o Google não informa data de nascimento, a regra 18+ continua valendo: a conta social fica sem registro em `private_profiles` e é encaminhada para `/completar-cadastro`, onde a pessoa confirma idade, nome civil e termos. A RPC valida a maioridade no banco, que é a última linha de defesa.

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

### Upload de fotos e vídeos

O upload depende de `public.register_profile_media`. Se essa RPC não existir no banco, cada envio sobe o arquivo para o storage, a chamada falha e o `catch` apaga o arquivo — a pessoa vê um erro e nada é gravado. `supabase/migrations/20261003020000_media_and_presence.sql` recria a função de forma idempotente.

### Presença real e feed da comunidade

`public.user_presence` é alimentada por `touch_presence`, chamada a cada 30s pelo dashboard. `online_members` lista quem foi visto nos últimos 90 segundos e `online_count` devolve só o total, usado pelo indicador da landing. Quem está transmitindo recebe o selo **AO VIVO**.

Isso substitui um contador que gerava o número com `Math.random()` e o apresentava como se fosse real. Agora o número vem do banco, e visitantes sem sessão veem "comunidade ativa" em vez de um número inventado.

O grid de mídias lê `public.profile_media` de todos os membros. Isso já é permitido pela política `members read profile gallery media`: a RLS libera a leitura quando o leitor está ativo e não há bloqueio entre as duas pessoas. Cada item continua passando por URL assinada curta.

### Encerramento automático das lives

Uma sessão em `live_sessions` nasce quando o host clica em "Iniciar com câmera" e só passa a `ENDED` quando ele encerra a transmissão. Qualquer outra saída — o host navigating para o dashboard, fechando a aba, ou uma entrada que falha no meio — deixava a linha como `LIVE` para sempre, e o dashboard continuava mostrando vários cards "Transmitindo agora" sem ninguém transmitindo.

O que o código faz agora:

- Sair da sala como host encerra a sessão (`leaveLive` faz o `PATCH` de `status`/`ended_at`); antes ele só apagava a presença de quem não era o apresentador.
- Fechar a aba ou navegar para fora de `/live` também encerra, via `pagehide`/desmontagem do provider, com `fetch(..., { keepalive: true })` para a requisição sobreviver à página. O back/forward cache é respeitado (`event.persisted`), então uma aba que volta do cache continua transmitindo.
- Iniciar uma live fecha antes as sessões antigas da mesma conta, e uma entrada que falha depois da criação do registro fecha a sessão recém-criada em vez de deixá-la órfã.
- A listagem passa por `src/lib/live/directory.ts`, usada tanto em `/live` quanto em `/dashboard`: ela esconde as sessões cujo apresentador não está mais conectado e recupera as sobras da própria conta. Um membro só pode encerrar a própria sessão (RLS), então as órfãs de outras pessoas dependem do RPC `public.live_active_sessions()`, que vem de `supabase/migrations/20261003030000_live_directory_integrity.sql` e considera=live apenas a sessão cujo host enviou presença nos últimos 90 segundos. Sem essa migração a listagem cai para a consulta antiga (`status=LIVE`) e as órfãs de outras contas continuam visíveis até ela ser aplicada.

### Diagnóstico rápido (live não abre / fica com 0 espectadores)

Verifique nesta ordem, porque cada passo depende do anterior:

1. **Migração de experiência de live aplicada?** As tabelas `live_viewer_presence` e `live_moderation_actions` e as RPCs `mark_live_presence`, `live_live_metrics`, `live_mute_user`, `live_remove_user` e `live_block_user` vêm de `supabase/migrations/20261003000000_live_experience.sql`. Se ela não foi aplicada no projeto, o contador de espectadores fica sempre em zero e a moderação não existe — a sala ainda abre, por isso o defeito passa despercebido. A tela agora exibe esse aviso explicitamente em vez de falhar em silêncio.
2. **Origem liberada na Edge Function?** `SINTONIAMORA_ALLOWED_ORIGINS` é uma lista separada por vírgulas e precisa conter o domínio real. Fora dela, a resposta vem com `Access-Control-Allow-Origin: null` e o navegador bloqueia a chamada — o sintoma é um erro genérico de rede ao entrar na live.
3. **Segredos do Tencent configurados?** Sem `TENCENT_SDK_SECRET_KEY` a função responde 503 com "Tencent RTC ainda não está configurado no servidor" e ninguém entra.
4. **HTTPS e WebRTC.** A câmera e o microfone exigem contexto seguro; `http://` fora de `localhost` faz o navegador negar a mídia.

Roteiro de conferência, com o projeto real:

```sh
# 1. as tabelas existem?
curl -s "$SUPABASE_URL/rest/v1/live_viewer_presence?select=*&limit=1" -H "apikey: $ANON"
# 404 PGRST205 = migração não aplicada

# 2. as RPCs existem?
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/mark_live_presence" \
  -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}'
# 404 PGRST202 = migração não aplicada

# 3. a Edge Function responde (401 sem sessão é o esperado: exige JWT)?
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$SUPABASE_URL/functions/v1/tencentrctoken" \
  -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}'
```

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
