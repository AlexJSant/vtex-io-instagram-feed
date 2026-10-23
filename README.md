# Sun House Instagram Feed

App VTEX IO/Store Framework que lê um snapshot persistido do Instagram e exibe
até oito publicações em um carrossel oficial `vtex.slider-layout`.

## Estado atual

- Bloco Store Framework: `instagram-feed`.
- Serviço Node 7.x com query GraphQL pública cacheável e sincronização manual
  protegida.
- Normalização de `IMAGE`, `VIDEO` e `CAROUSEL_ALBUM`.
- Vídeos usam apenas `thumbnail_url`; o contrato público não contém token, URL
  de vídeo, resposta bruta da Meta nem filhos desnecessários.
- Persistência VBase isolada por `development`/`production`.
- Snapshots são imutáveis; a leitura usa `latest.json`, atualizado com
  comparação de `syncStartedAt` e ETag/`If-Match` para impedir que uma execução
  antiga substitua uma mais nova.
- Fixtures são opt-in, marcadas como `source: "fixture"` e bloqueadas no
  componente por padrão.

## Integração no tema

Este repositório não contém o tema. No `manifest.json` do tema:

```json
{
  "dependencies": {
    "sunhouse.instagram-feed": "0.x"
  }
}
```

Na segunda dobra da home:

```json
{
  "instagram-feed#home": {
    "props": {
      "title": "Acompanhe a Sun House no Instagram",
      "allowDevelopmentFixtures": false
    }
  }
}
```

Para visualizar fixtures em um workspace de desenvolvimento, faça uma chamada
`POST` autenticada para:

```text
/_v/sunhouse/instagram-feed/sync?source=fixture
```

e habilite temporariamente `allowDevelopmentFixtures`. O parâmetro é ignorado
no workspace `master`. Não use essa opção como fallback de produção.

O bloco já renderiza geometria inicial de quatro cards 4:5. Se o tema adiar o
bloco inteiro com um mecanismo de lazy rendering, o contêiner do tema também
deve reservar a mesma área; um skeleton montado depois do adiamento não reserva
espaço por si só.

## API

- `instagramFeed`, no GraphQL do app: somente lê o último snapshot válido. A
  query usa GraphQL builder `2.x`, `@auth(scope: PUBLIC)` e
  `@cacheControl(scope: PUBLIC, maxAge: 300)`.
- `POST /_v/sunhouse/instagram-feed/sync`: rota privada com resource-based
  policy que permite POST somente ao operador administrativo explicitamente
  listado; nunca é chamada pela visita à home.
- `POST /_v/sunhouse/instagram-feed/sync-scheduler`: entrada externa dedicada
  ao Google Cloud Scheduler. A rota é pública no transporte do Node 7.x para
  não exigir identidade VTEX, mas o middleware exige
  `X-Sunhouse-Scheduler-Token` antes de criar o repositório ou sincronizar.
  Outros métodos retornam `405`; credenciais ausentes ou inválidas retornam
  `401`; configuração indisponível retorna `503`.

O bloco consome a query com React Apollo, que é a integração recomendada pela
VTEX para comunicação entre Store Framework e backend. A antiga rota pública
`GET /_v/sunhouse/instagram-feed` foi removida. A diretiva `@auth` controla
acesso; `@cacheControl` controla o cache e não substitui autorização.

O cliente Meta usa exclusivamente `https://graph.instagram.com/v25.0`, token no
header `Authorization`, timeout e tentativas limitadas. A paginação reutiliza
somente o cursor `after`, sem seguir URLs fornecidas pela resposta.

## Credencial

`instagramAccessToken` e `schedulerSyncSecret` são **App Settings privadas**.
O `settingsSchema` não declara `access: "public"`; portanto, as configurações
não são retornadas por `publicSettingsForApp`. O serviço Node as lê usando
`ctx.clients.apps.getAppSettings(process.env.VTEX_APP_ID)`.

Depois que o app estiver linkado manualmente no workspace de desenvolvimento:

1. na mesma conta VTEX, abra **Apps > App Management** no Admin;
2. abra **Sun House Instagram Feed** e sua página de configurações;
3. informe o token diretamente no campo **Instagram access token**;
4. gere `schedulerSyncSecret` a partir de pelo menos 32 bytes aleatórios com
   uma fonte criptograficamente segura, informe-o em **Scheduler sync secret**
   e salve. Por exemplo, execute localmente `openssl rand -base64 32` e
   transfira o resultado diretamente ao Admin e ao Secret Manager;
5. execute a rota de sincronização manual sem `source=fixture`.

Não compartilhe nenhum dos valores por chat e não os adicione ao código, Git,
frontend, GraphQL, URLs, fixtures, logs ou VBase. Não reutilize o token Meta
como segredo do scheduler. O formato `password` mascara o campo na interface,
mas não substitui controle de acesso administrativo, rotação e revogação.

Fixtures continuam disponíveis sem App Settings somente pela rota protegida e
fora do workspace `master`.

Falhas não registram headers, URLs de paginação, token ou corpo bruto da Meta.

## Agendamento

Não foi encontrada uma API nativa de cron durável com fuso no Node IO. Eventos
do `service.json` são consumidores reativos, não agendadores. O Google Cloud
Scheduler deve chamar:

```text
POST https://dev1--sunhouse.myvtex.com/_v/sunhouse/instagram-feed/sync-scheduler
X-Sunhouse-Scheduler-Token: <SEGREDO>
corpo vazio
```

A URL acima é a forma prevista para o workspace `sunhouse/dev1`; ela não foi
testada externamente por este projeto. Configure o job sem token OIDC/OAuth do
Google. Proteja a configuração do job com IAM mínimo, limite quem pode ler ou
alterar seus headers e nunca envie o segredo na query string.
`source=fixture` é ignorado nessa rota, que sempre usa a origem Meta.

Antes da produção, publique a versão aprovada, cadastre as App Settings na
instalação de produção, troque a URL para o domínio de produção, valide a
duração real para definir timeout/retry e configure monitoramento. A rota
responde somente depois da persistência; respostas não `2xx` devem ser tratadas
como falha pelo scheduler.

## Desenvolvimento

```sh
yarn lint
yarn typecheck
yarn test
```

Antes de `vtex link`, confirme explicitamente a conta e o workspace e prossiga
somente em workspace de desenvolvimento. Não publique nem promova este app
durante a validação.

Consulte [TODO.md](TODO.md) para decisões obrigatórias antes da produção.
O histórico técnico da implementação está em
[docs/DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md).

## Referências VTEX

- [Creating an interface for your app settings](https://developers.vtex.com/docs/guides/vtex-io-documentation-creating-an-interface-for-your-app-settings)
- [GraphQL builder](https://developers.vtex.com/docs/guides/vtex-io-documentation-graphql-builder)
- [GraphQL authorization in IO apps](https://developers.vtex.com/docs/guides/graphql-authorization-in-io-apps)
- [Implementing cache in GraphQL APIs for IO apps](https://developers.vtex.com/docs/guides/implementing-cache-in-graphql-apis-for-io-apps)
- [Consuming data in Store Framework](https://developers.vtex.com/docs/guides/vtex-io-documentation-7-consuming-data)
- [VTEX IO CLI command reference](https://developers.vtex.com/docs/guides/vtex-io-documentation-vtex-io-cli-command-reference)
- [FastStore/WebOps variables and secrets](https://developers.vtex.com/docs/guides/faststore/webops-managing-variables-and-secrets)
