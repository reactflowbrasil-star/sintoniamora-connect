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
3. Em **Authentication → URL Configuration**, permita a URL exata de retorno usada pelo build publicado: `https://sexflow.run.place/sexflow/entrar`. O app usa `/sexflow/` como base; por isso `/entrar` não é o callback correto em produção. Para desenvolvimento local, permita também `http://localhost:8083/sexflow/entrar`.

O **Site URL** também precisa ser `https://sexflow.run.place` (na raiz, sem `/sexflow`). O callback precisa voltar ao mesmo domínio em que o login começou, pois o verifier PKCE é guardado no armazenamento daquele navegador/origem. Se o Site URL continuar apontando para `fredimproducoes.com.br/sexflow/`, um callback não permitido pode voltar ao domínio antigo e mostrar “PKCE code verifier not found in storage”.

Como o Google não informa data de nascimento, a regra 18+ continua valendo: a conta social fica sem registro em `private_profiles` e é encaminhada para `/completar-cadastro`, onde a pessoa confirma idade, nome civil e termos. A RPC valida a maioridade no banco, que é a última linha de defesa.

Rotas implementadas:

- `/cadastro`: cadastro 18+ com nome civil privado, nome de exibição, senha e aceite dos termos.
- `/entrar`: autenticação de e-mail e senha.
- `/perfil`: edição do perfil e upload/exclusão de fotos e vídeos. Limites Free são verificados pelo Postgres/Storage.

### Domínio de produção e confirmação de e-mail

O domínio de produção é **`https://sexflow.run.place`**. Os domínios antigos (`sintoniamora.lovable.app`, `sintoniamora.netlify.app`) seguem na lista de origens da Edge Function para não quebrar links em circulação. No Supabase, abra **Authentication → URL Configuration** e configure:

- **Site URL:** `https://sexflow.run.place` (raiz do domínio).
- **Redirect URL do Google:** `https://sexflow.run.place/sexflow/entrar`. A aplicação está publicada sob a base `/sexflow/` e o login social volta para essa rota. Para desenvolvimento local, use `http://localhost:8083/sexflow/entrar`.
- **Authentication → Email Templates → Confirm signup:** substitua o link de uso único por um código OTP e um link que apenas abre o formulário. Exemplo:

```html
<h2>Confirme seu e-mail no Sintoniamora</h2>
<p>Digite este código de 6 números no aplicativo:</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 8px">{{ .Token }}</p>
<p><a href="{{ .SiteURL }}/sexflow/confirmar-email">Abrir confirmação de e-mail</a></p>
<p>Se você não criou esta conta, ignore esta mensagem.</p>
```

- Mantenha **Confirm email** ativado para exigir validação antes do primeiro login.

O app oferece `/confirmar-email` para verificar o código com o Supabase e criar a sessão. A confirmação por código evita que a pré-abertura automática de links por provedores de e-mail consuma o token antes da pessoa usuária. O callback por link continua suportado para mensagens já enviadas. Os redirecionamentos usados pelo cadastro e pelo reenvio precisam corresponder à lista autorizada no Supabase.

Rotas implementadas:

- `/cadastro`: cadastro 18+ com nome civil privado, nome de exibição, senha e aceite dos termos.
- `/confirmar-email`: validação do código OTP de seis dígitos e reenvio do código.
- `/entrar`: autenticação de e-mail e senha com reenvio de confirmação para contas ainda não verificadas.
- `/recuperar-senha`: recuperação de senha por e-mail (link ou código de 6 números).
- `/perfil`: edição do perfil e upload/exclusão de fotos e vídeos. Limites Free são verificados pelo Postgres/Storage.

### Recuperar senha

`/entrar` tem o link "Esqueceu a senha?", que leva para `/recuperar-senha`. A tela tem três estados na mesma rota:

1. **Pedido do e-mail** — `POST /auth/v1/recover` com `options.redirectTo` apontando para `/recuperar-senha`. A resposta é a mesma havendo ou não uma conta com aquele e-mail, e a tela diz isso, para não confirmar se um endereço está cadastrado.
2. **Código de 6 números** — quando o modelo de e-mail do Supabase usa OTP (o mesmo da confirmação de cadastro), a pessoa digita o código e `POST /auth/v1/verify` com `type=recovery` abre a sessão de recuperação. Reenviar o e-mail é chamar `/auth/v1/recover` de novo: `/auth/v1/resend` não aceita `recovery` entre os tipos suportados e responde `Missing one of these types: signup, email_change, sms, phone_change`.
3. **Nova senha** — com a sessão de recuperação em mãos, `PUT /auth/v1/user` troca a senha e a pessoa volta para `/entrar`.

O link de recuperação chega com `type=recovery`. Antes ele caía no mesmo tratamento da confirmação de cadastro, que jogava a pessoa para `/perfil` e deixava a troca de senha inalcançável depois do consumo do link; `completeAuthCallback` agora devolve `recovery: true` e `__root` encaminha para `/recuperar-senha`. O mesmo vale para `token_hash` com `type=recovery`.

## Área do membro e administração

- `/dashboard`: resumo da conta, conclusão do perfil, conexões, mídia, notificações, mensagens, publicações, plano atual e atalhos para as áreas da comunidade.
- `/admin`: painel restrito a administradores para acompanhar métricas, buscar usuários, suspender ou reativar contas, atribuir planos manualmente, editar catálogo e limites, e revisar denúncias.
- As permissões administrativas e o bloqueio de contas suspensas são verificados no banco. As operações privilegiadas deixam um registro interno de auditoria.
- O painel não processa pagamentos. Checkout e cobrança recorrente ainda precisam de integração com um gateway.
- O badge “Edit with Lovable” é ocultado no navegador, inclusive quando a hospedagem o injeta depois da página carregar.

## Lives com Tencent RTC

A rota `/live` usa o SDK Web oficial `trtc-sdk-v5` para vídeo/áudio em tempo real no cenário `live`: o apresentador entra como `anchor` e espectadores como `audience`. O chat da sala é persistido no Postgres e entregue em tempo real pelo Supabase Realtime, sujeito às políticas RLS. O `SDKSecretKey` nunca é incluído no bundle do navegador.

### Criar foto ou vídeo pelo painel

O atalho **"Criar foto ou vídeo"** em `/dashboard` abre um estúdio de captura que usa a câmera do celular ou do notebook (`getUserMedia`) para tirar uma foto ou gravar um clipe com `MediaRecorder`, e publica direto no feed com legenda e visibilidade (público ou só seguidores).

- A gravação para sozinha em 30s, com o tempo na tela, e respeita o limite de 50 MB do bucket `post-media`. A foto sai em JPEG e o vídeo em WEBM/MP4 — os formatos aceitos pelo bucket e pela validação de `src/lib/feed/publish.ts`.
- Há botão para trocar entre a câmera frontal e a traseira quando o aparelho tem mais de uma, e a selfie é espelhada como em qualquer app de câmera (a foto gravada não é).
- Câmera negada, contexto não seguro (`http://` fora de `localhost`) ou navegador sem `MediaRecorder` caem em mensagens explícitas, e o envio de arquivo do dispositivo continua disponível dentro do mesmo modal.
- `/feed` e o estúdio usam o mesmo pipeline (`publishPost`), então os dois caminhos de publicação se comportam igual.

### Upload de fotos, vídeos e anexos

O binário das mídias fica em diretório privado do servidor Fredimproduções, fora da pasta pública do site. O app autentica cada envio no Supabase, limita o diretório ao ID do usuário e guarda no banco somente os metadados sujeitos a RLS. As galerias usam links assinados curtos; mídias antigas do Supabase Storage são migradas para o servidor na primeira leitura permitida.

Fotos e vídeos recebem a marca do SexFlow centralizada, com transparência discreta. O servidor processa fotos e GIFs com Sharp e vídeos com FFmpeg; o workflow de publicação inclui os processadores Linux no pacote implantado. Mensagens aceitam fotos e áudio; a exclusão individual também remove o arquivo privado. Limpar uma conversa oculta o histórico somente para a própria conta, sem apagar as mensagens da outra pessoa.

`supabase/migrations/20261004090000_server_hosted_media.sql` aplica os limites e regras RLS dos metadados de mídia, a correção de gravação de galeria sem depender de linhas em `storage.objects`, os novos campos de busca/localização com coordenadas aproximadas, a limpeza de mensagens/notificações e as tabelas de anexos e reações do chat.

### Presença real e feed da comunidade

`public.user_presence` (criada em `20261003040000_repair_missing_backend.sql`) é alimentada por `touch_presence`, chamada a cada 30s pelo dashboard. `online_members` lista quem foi visto nos últimos 90 segundos e `online_count` devolve só o total, usado pelo indicador da landing. Quem está transmitindo recebe o selo **AO VIVO**.

Isso substitui um contador que gerava o número com `Math.random()` e o apresentava como se fosse real. Agora o número vem do banco, e visitantes sem sessão veem "comunidade ativa" em vez de um número inventado.

O grid de mídias lê metadados de `public.profile_media` de outros membros quando ambos estão ativos e não há bloqueio entre eles. Cada imagem ou vídeo passa por URL assinada curta do servidor.

### Busca de membros

`/busca` oferece gênero, etnia, fetiches, categoria, estado, cidade, foto, Premium e raio de proximidade. A localização é opcional, arredondada no servidor para cerca de 1 km e compartilhada somente com consentimento; resultados exibem a distância aproximada. Alterações de perfil chegam pela atualização em tempo real. `/explorar` mantém a grade de fotos de perfil em quadrados grandes.

A página carrega até 200 perfis de uma vez e filtra no cliente. Acima disso o filtro deixaria de ser instantâneo e o navegador travaria; para a base real de produção, a busca precisa ir para o banco (RPC com `tsvector`/`pg_trgm`) em vez de trazer tudo.

### Livecam

`/livecam` é a grade de salas em direto com filtro por categoria no topo (Mulher, Homem, Casal, Transexual, Crossdresser (CD), Travesti e Outros), no formato dos sites de câmera ao vivo: imagem da pessoa, selo AO VIVO, espectadores, destaque, nome com estrela de conta premium, categoria e cidade. O card abre a sala em `/live?session=<id>`.

- O diretório vem de `loadLiveDirectory` (`src/lib/live/directory.ts`), o mesmo de `/live` e `/dashboard`: só entra na grade a sessão cujo host está de fato conectado, então sala abandonada não fica exposta. A página escuta `live_sessions` no Realtime e também atualiza a cada 20s.
- **Categoria não é coluna no banco.** `profiles` só tem `interests` (text[]), então é de lá que a categoria sai: o seletor "Categorias de livecam" em `/perfil` grava exatamente os rótulos reconhecidos (`src/lib/livecam.ts`) e a leitura compara sem acento e sem caixa. Sem correspondência, a sala cai em "Outros" — nada é inferido.
- O número de espectadores vem da RPC `live_live_metrics`, **uma chamada por sala**. Sem essa RPC no banco (hoje é o caso: `404 PGRST202`), o cartão mostra o selo AO VIVO e omite o contador, em vez de inventar número. Por causa disso a grade é cortada em 24 salas.
- A estrela no nome indica assinatura Premium ativa em `subscriptions`, e o selo "destaque" acompanha a maior audiência medida entre as salas — sem métrica, ninguém é destacado.

### Encerramento automático das lives

Uma sessão em `live_sessions` nasce quando o host clica em "Iniciar com câmera" e só passa a `ENDED` quando ele encerra a transmissão. Qualquer outra saída — o host navigating para o dashboard, fechando a aba, ou uma entrada que falha no meio — deixava a linha como `LIVE` para sempre, e o dashboard continuava mostrando vários cards "Transmitindo agora" sem ninguém transmitindo.

O que o código faz agora:

- Sair da sala como host encerra a sessão (`leaveLive` faz o `PATCH` de `status`/`ended_at`); antes ele só apagava a presença de quem não era o apresentador.
- Fechar a aba ou navegar para fora de `/live` também encerra, via `pagehide`/desmontagem do provider, com `fetch(..., { keepalive: true })` para a requisição sobreviver à página. O back/forward cache é respeitado (`event.persisted`), então uma aba que volta do cache continua transmitindo.
- Iniciar uma live fecha antes as sessões antigas da mesma conta, e uma entrada que falha depois da criação do registro fecha a sessão recém-criada em vez de deixá-la órfã.
- A listagem passa por `src/lib/live/directory.ts`, usada tanto em `/live` quanto em `/dashboard`: ela esconde as sessões cujo apresentador não está mais conectado e recupera as sobras da própria conta. Um membro só pode encerrar a própria sessão (RLS), então as órfãs de outras pessoas dependem do RPC `public.live_active_sessions()`, que vem de `supabase/migrations/20261003030000_live_directory_integrity.sql` e considera=live apenas a sessão cujo host enviou presença nos últimos 90 segundos. Sem essa migração a listagem cai para a consulta antiga (`status=LIVE`) e as órfãs de outras contas continuam visíveis até ela ser aplicada.

### Diagnóstico rápido (live não abre / fica com 0 espectadores)

Verifique nesta ordem, porque cada passo depende do anterior:

1. **Camada de live aplicada?** As tabelas `live_viewer_presence` e `live_moderation_actions` vêm de `supabase/migrations/20261003000000_live_experience.sql`, e as RPCs `mark_live_presence`, `live_live_metrics`, `live_mute_user`, `live_remove_user`, `live_block_user` e `live_active_sessions` estão reunidas em `supabase/migrations/20261003040000_repair_missing_backend.sql`. Se elas faltarem, o contador de espectadores fica sempre em zero, a moderação não existe e a listagem mostra sessões abandonadas — a sala ainda abre, por isso o defeito passa despercebido. A tela exibe esse aviso explicitamente em vez de falhar em silêncio. No projeto implantado as tabelas existem e as RPCs não: basta aplicar a migração de reparo.
2. **Origem liberada na Edge Function?** `SINTONIAMORA_ALLOWED_ORIGINS` é uma lista separada por vírgulas e precisa conter o domínio real, hoje `https://sexflow.run.place`. Fora dela, a resposta vem com `Access-Control-Allow-Origin: null` e o navegador bloqueia a chamada — o sintoma é um erro genérico de rede ao entrar na live.
3. **Segredos do Tencent configurados?** Sem `TENCENT_SDK_SECRET_KEY` a função responde 503 com "Tencent RTC ainda não está configurado no servidor" e ninguém entra. Confira em **Edge Functions → tencentrctoken → Secrets**; é o único passo que ainda falta no projeto implantado.
4. **HTTPS e WebRTC.** A câmera e o microfone exigem contexto seguro; `http://` fora de `localhost` faz o navegador negar a mídia.

Roteiro de conferência, com o projeto real:

```sh
# 1. as tabelas existem?
curl -s "$SUPABASE_URL/rest/v1/live_viewer_presence?select=*&limit=1" -H "apikey: $ANON"
# 404 PGRST205 = migração não aplicada

# 2. as RPCs existem?
# 401 = existe e exige sessão (o resultado esperado); 404 PGRST202 = não existe
for fn in register_profile_media mark_live_presence live_live_metrics \
           live_active_sessions touch_presence online_count complete_member_registration; do
  printf '%s ' "$fn"
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$SUPABASE_URL/rest/v1/rpc/$fn" \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
    -H "Content-Type: application/json" -d '{}'
done

# 3. a Edge Function responde (401 sem sessão é o esperado: exige JWT)?
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$SUPABASE_URL/functions/v1/tencentrctoken" \
  -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}'
```

### Ativação

Estado verificado no projeto implantado em 2026-10-04: a Edge Function `tencentrctoken` está **deployada** (responde 401 sem JWT, que é o esperado) e a migration `20261002061413_sintoniamora_realtime_tencent.sql` já está aplicada. O `SDKAppID` usado é `20048927`, que já é o padrão em `supabase/functions/tencentrctoken/index.ts` — ou seja, `TENCENT_SDK_APP_ID` é opcional. **Falta apenas configurar os segredos**, e isso só é feito no painel do Supabase:

1. No console Tencent RTC, confirme que o serviço Live está ativo e que o **SDKAppID `20048927`** é o desta conta. A documentação do console foi escrita para o UIKit Vue; este repositório React usa direto o SDK Web TRTC.
2. No Supabase, abra **Edge Functions → tencentrctoken → Secrets** e cadastre:

   | nome | valor |
   | --- | --- |
   | `TENCENT_SDK_SECRET_KEY` | a SDKSecretKey do aplicativo, copiada do console do Tencent |
   | `SINTONIAMORA_ALLOWED_ORIGINS` | domínios liberados, separados por vírgula: `https://sexflow.run.place,https://sintoniamora.lovable.app,http://localhost:8083` |
   | `TENCENT_SDK_APP_ID` | `20048927` (opcional, já é o padrão da função) |

   Quem usa a CLI, no terminal — nunca no repositório:

   ```sh
   supabase secrets set TENCENT_SDK_APP_ID=20048927 TENCENT_SDK_SECRET_KEY='(defina no terminal seguro)' SINTONIAMORA_ALLOWED_ORIGINS='https://sexflow.run.place,https://sintoniamora.lovable.app,http://localhost:8083'
   ```

   Esse segredo tem precedência sobre a lista padrão que está no código da função, então cadastrá-lo já resolve a origem nova **sem** precisar redeployar.

   Não é preciso redeployar a função: o Supabase injeta os segredos na próxima invocação. Um redeploy também funciona, se preferir garantir.

A function exige sessão Supabase válida, valida o acesso à live pela RLS e emite um UserSig curto o bastante para uso de sessão, sem devolver a chave Tencent. Nunca cadastre a chave em variável `VITE_*` (isso a colocaria no bundle do navegador), em arquivo versionado ou em ticket. **Como a SDKSecretKey foi compartilhada em texto puro numa conversa, rotacione-a no console do Tencent antes de produção e cadastre a nova apenas como segredo do Supabase** — a chave atual deve ser tratada como comprometida.

### Funcionamento e limites conhecidos

- Apresentador precisa permitir câmera e microfone; navegador e site precisam suportar WebRTC, e produção deve usar HTTPS.
- O banco aplica RLS a criação/encerramento de salas e ao chat; somente o dono encerra a transmissão. Os eventos de sala e chat estão publicados no Supabase Realtime.
- Espectadores entram com papel `audience`, sem publicação de mídia, conforme as permissões do TRTC.
- O `SDKSecretKey` precisa ser configurado como segredo da Edge Function no Supabase (passo 2 de "Ativação"). Sem ele a função responde 503 "Tencent RTC ainda não está configurado no servidor" em vez de simular uma live.
