# Development Log - Sun House Instagram Feed

Este documento registra as decisões, implementações, correções e validações
realizadas durante o desenvolvimento do app `sunhouse.instagram-feed`.

---

## 📅 Data: 21/10/2026

### 🎯 Objetivos da sessão

- Implementar um feed real do Instagram da Sun House para Store Framework.
- Exibir até oito publicações em um carrossel oficial `vtex.slider-layout`.
- Criar um backend Node/TypeScript sem expor a credencial Meta ao frontend.
- Normalizar imagens, vídeos/Reels e álbuns para um contrato público reduzido.
- Persistir a última sincronização válida no VBase.
- Separar leitura pública, sincronização e frequência de atualização.
- Implementar skeleton, lazy loading, acessibilidade e estados de falha seguros.
- Integrar e validar o bloco na segunda dobra da home do tema Sun House.
- Registrar pendências de agendamento, renovação do token, VBase e produção.

---

## 📋 Resumo da implementação

O app passou de um boilerplate VTEX IO para uma integração completa composta
por:

```text
Instagram API
  → sincronização Node protegida
  → normalização e validação
  → snapshot VBase development/latest.json
  → GraphQL público cacheável
  → React Apollo
  → vtex.slider-layout
  → bloco instagram-feed na home
```

**Identidade do app:** `sunhouse.instagram-feed@0.0.1`

**Perfil integrado:** `sunhousemoveis`

**Ambiente validado:** conta `sunhouse`, workspace `dev1`

**Resultado funcional:** oito publicações reais foram lidas da Meta,
normalizadas, persistidas e renderizadas na home em desenvolvimento.

Nenhuma publicação, promoção de workspace ou alteração de produção foi
executada nesta sessão.

---

## ✅ Alterações implementadas (21/10/2026)

### 1. Bloco Store Framework e carrossel oficial

**Objetivo:** disponibilizar um bloco reutilizável para a home sem implementar
um motor próprio de carrossel.

Foi registrado o bloco `instagram-feed` em `store/interfaces.json`, usando o
entrypoint existente `react/defaultApp.tsx`.

O componente utiliza `vtex.slider-layout` e implementa:

- até oito publicações únicas;
- quatro cards no desktop;
- quantidade responsiva no tablet;
- um card e parte do próximo no mobile;
- navegação manual;
- navegação infinita somente quando há itens suficientes;
- autoplay desativado;
- card inteiro como link para o post original;
- abertura em nova aba com `noopener noreferrer`;
- nenhuma legenda, CTA, contador ou modal no MVP.

**Correção de integração:** `interfaces.json` inicialmente apontava para
`InstagramFeed`, mas o boilerplate exportava `defaultApp`. O nome foi alinhado
para permitir que o Store Framework resolvesse o componente correto.

**Status:** ✅ Renderização funcional confirmada no workspace `dev1`

---

### 2. Skeleton, lazy loading e acessibilidade

O componente reserva uma área compatível com quatro cards em proporção próxima
de 4:5 enquanto a consulta está carregando.

Foram implementados:

- skeleton com geometria estável;
- `loading="lazy"` e `decoding="async"` nas imagens;
- descarte visual de imagens que falham ao carregar;
- `altText` normalizado;
- rótulo acessível no carrossel;
- indicação de abertura em nova aba;
- foco visível nos cards;
- respeito a `prefers-reduced-motion`;
- estados vazios e de erro sem mensagem técnica para o visitante.

Para diagnóstico sem expor detalhes ao público, o placeholder usa
`data-feed-state` com os valores:

- `query-error`;
- `missing-feed`;
- `empty`;
- `fixture-blocked`.

Skeleton não foi tratado como evidência automática de melhoria de LCP ou CLS.
Medições comparativas permanecem pendentes.

---

### 3. Consulta GraphQL e integração React Apollo

Uma rota REST pública de leitura chegou a ser considerada, mas foi removida
após revisão da arquitetura VTEX.

A leitura pública final usa:

- builder `graphql: "2.x"`;
- query `instagramFeed`;
- `@auth(scope: PUBLIC)`;
- `@cacheControl(scope: PUBLIC, maxAge: 300)`;
- React Apollo no componente.

**Problema encontrado:** a query React não tinha o provider do app e era enviada
ao GraphQL padrão da loja.

**Correção:**

```graphql
instagramFeed @context(provider: "sunhouse.instagram-feed")
```

Após a correção, o backend passou a receber as consultas da home com HTTP 200.

**Contrato público:**

```text
id
mediaType
coverUrl
permalink
publishedAt
altText
lastSyncedAt
source
```

O contrato não contém token, resposta bruta da Meta, URL de vídeo ou filhos
desnecessários de álbuns.

---

### 4. Cliente Meta e normalização

O backend usa exclusivamente:

```text
https://graph.instagram.com/v25.0
```

O token é enviado no header `Authorization: Bearer`, nunca em query string.

Foram implementados:

- timeout;
- tentativas limitadas com espera progressiva;
- paginação por cursor `after`;
- limite de três páginas;
- deduplicação;
- ordenação por timestamp decrescente;
- limite final de oito itens elegíveis;
- validação do perfil esperado;
- validação de URLs;
- descarte controlado de itens sem capa.

**Regras por tipo:**

| Tipo Meta | Comportamento |
| --- | --- |
| `IMAGE` | Usa `media_url` como capa |
| `VIDEO` / Reels | Usa somente `thumbnail_url`; vídeo não é enviado ao frontend |
| `CAROUSEL_ALBUM` | Um único card; usa a primeira mídia válida do álbum |
| Stories | Fora do escopo |

**Validação real:**

- `/me` retornou `user_id` esperado e `username: sunhousemoveis`;
- `/me/media` retornou oito itens;
- a amostra real continha `IMAGE`, `VIDEO` e `CAROUSEL_ALBUM`;
- capas de vídeo estavam presentes;
- nenhuma credencial foi impressa durante os testes.

---

### 5. App Settings privadas para a credencial Meta

Foi implementado `settingsSchema` no `manifest.json` com o campo:

```text
instagramAccessToken
```

Decisões de segurança:

| Aspecto | Decisão |
| --- | --- |
| Visibilidade | `access: "public"` não foi declarado |
| Interface | Campo com `format: "password"` |
| Leitura | Somente no Node via `ctx.clients.apps.getAppSettings(...)` |
| Frontend | Nunca recebe o valor |
| Persistência de feed | Token não é salvo no VBase |
| Logs e erros | Headers, token e corpos brutos não são registrados |

O valor foi cadastrado diretamente no Admin VTEX em **Apps > App Management**.
A persistência foi confirmada pela API privada de Apps retornando somente um
booleano sanitizado; o conteúdo nunca foi exibido.

O formato `password` mascara a interface, mas não substitui controle de acesso,
rotação e revogação.

---

### 6. Persistência VBase e separação de ambientes

O VBase foi isolado atrás da interface `FeedRepository`.

Os caminhos usam prefixos explícitos:

```text
development/
production/
```

Foram mantidos snapshots imutáveis para auditoria e criado um ponteiro estável:

```text
development/latest.json
production/latest.json
```

**Problema encontrado:** `listFiles` retornava 404 no app linkado mesmo após
`saveJSON`, fazendo o GraphQL devolver `items: []`.

**Correção:** a leitura pública deixou de depender da listagem do bucket e passou
a usar `getJSON` diretamente em `latest.json`.

**Proteção contra concorrência:**

1. A sincronização lê o snapshot atual e seu ETag.
2. Um snapshot com `syncStartedAt` mais antigo não substitui um mais novo.
3. Atualizações do ponteiro existente usam `If-Match`.
4. Conflitos HTTP 409/412 repetem leitura e comparação, com limite de quatro
   tentativas.
5. O snapshot imutável é preservado separadamente.

O VBase apresentou consistência eventual na primeira releitura: a gravação foi
confirmada em uma chamada posterior com:

```json
{
  "itemCount": 8,
  "persistedItemCount": 8,
  "source": "meta"
}
```

**Observação:** a descontinuação anunciada do VBase permanece registrada para
decisão futura. Nenhuma entidade customizada de Master Data foi criada.

---

### 7. Sincronização manual protegida

Foi implementada a rota:

```text
POST /_v/sunhouse/instagram-feed/sync
```

A visita à home não chama a Meta nem inicia sincronização.

**Correção de autorização:** a configuração inicial usava
`workspace-read-write`, uma role-based policy inadequada para chamadas feitas
diretamente por um usuário Admin. Isso resultava em HTTP 403.

A rota passou a usar resource-based policy REST e permite POST somente ao
operador administrativo explicitamente configurado.

O retorno é sanitizado:

```json
{
  "ok": true,
  "itemCount": 8,
  "persistedItemCount": 8,
  "lastSyncedAt": "...",
  "source": "meta"
}
```

Em falhas, retorna apenas categoria e status upstream quando disponível.

Fixtures continuam disponíveis somente por opt-in, fora de `master`, usando:

```text
POST /_v/sunhouse/instagram-feed/sync?source=fixture
```

Elas são identificadas como `source: "fixture"` e não funcionam como fallback
silencioso para falhas reais.

---

### 8. Agendamento automático

Foi revisada a documentação oficial do Node IO e de `service.json`.

**Conclusão:** o runtime Node IO não oferece cron durável com configuração de
horário e fuso. Eventos de `service.json` são consumidores reativos e precisam
de um emissor; timers de processo não são duráveis.

O horário definido continua sendo:

```text
09:00
19:00
America/Sao_Paulo
```

A rota manual permanece para bootstrap e recuperação. A recorrência automática
depende da escolha de um scheduler externo.

Opções registradas:

- infraestrutura já existente da Sun House;
- Google Cloud Scheduler;
- AWS EventBridge Scheduler;
- GitHub Actions agendada.

O scheduler deverá usar credencial VTEX própria, armazenada no cofre do serviço.
O token Meta não será entregue ao scheduler.

**Status:** ⏳ Decisão pendente

---

### 9. Integração no tema Sun House

O tema validado foi:

```text
C:\Users\Alex-PC\Documents\_Git\sunhouse-vtex-io
sunhouse.sunhouse@1.7.3
```

O `manifest.json` do tema declara:

```json
"sunhouse.instagram-feed": "0.x"
```

O bloco foi incluído na home por meio de:

```jsonc
"container#instagram-feed": {
  "children": ["instagram-feed#home"]
},
"instagram-feed#home": {
  "props": {
    "title": "Acompanhe a Sun House no Instagram",
    "allowDevelopmentFixtures": false
  }
}
```

O bloco está posicionado depois do `__fold__`, preservando a prioridade da
primeira dobra.

**Status:** ✅ Integração funcional confirmada no tema linkado

---

### 10. Correção do `SliderLayout.classes`

**Problema observado:**

```text
[css-handles] Invalid 'classes' option.
Use the 'useCustomClasses' hook to generate a valid 'classes' object.
```

Um objeto comum estava sendo passado à prop `classes` do `SliderLayout`, mas
`vtex.css-handles@1.x` exige um objeto produzido por `useCustomClasses`.

**Solução:** a customização inválida foi removida. O carrossel usa os CSS Handles
nativos do `vtex.slider-layout`.

Essa decisão mantém a integração funcional e deixa o posicionamento fino das
setas como refinamento visual posterior.

**Status:** ✅ Corrigido

---

### 11. Falhas do link incremental VTEX

Durante o desenvolvimento, o watcher do `vtex link` tentou enviar arquivos não
TypeScript para a lista `files` do compilador Node:

```text
TS6054: manifest.json has an unsupported extension
TS6054: service.json has an unsupported extension
TS6054: schema.graphql has an unsupported extension
```

Também ocorreu um bundle incremental sem:

```text
./service/schema.graphql
```

Essas falhas foram específicas do patch incremental do Builder Hub. Builds
completos executados manualmente pelo desenvolvedor concluíram com sucesso.

Procedimento adotado:

1. não executar `vtex link` pelo agente;
2. interromper watchers inconsistentes;
3. confirmar `sunhouse/dev1`;
4. linkar o app;
5. aguardar `App linked successfully`;
6. linkar o tema;
7. evitar salvar arquivos estruturais durante o build completo.

Nenhum comando de publicação, deploy ou promoção foi executado.

---

## 📁 Principais arquivos criados ou modificados

| Arquivo | Finalidade |
| --- | --- |
| `manifest.json` | Builders, dependências, policies e App Settings privadas |
| `store/interfaces.json` | Registro do bloco `instagram-feed` |
| `graphql/schema.graphql` | Contrato público e cache GraphQL |
| `react/defaultApp.tsx` | Componente, skeleton, estados e carrossel |
| `react/graphql/instagramFeed.gql` | Query com provider do app |
| `react/styles.css` | Geometria, cards, skeleton e responsividade inicial |
| `react/typings/vtex.slider-layout.d.ts` | Tipagem do slider utilizado |
| `node/index.ts` | Composição do serviço |
| `node/service.json` | Rota protegida e limites operacionais |
| `node/routes.ts` | Sincronização manual e respostas sanitizadas |
| `node/credentials.ts` | Leitura e validação das App Settings |
| `node/clients/instagram.ts` | Cliente restrito à Graph Instagram API |
| `node/normalize.ts` | Normalização dos tipos de mídia |
| `node/repository.ts` | Persistência VBase, ponteiro e concorrência |
| `node/sync.ts` | Orquestração, paginação, metadata e preservação |
| `node/fixtures.ts` | Fixtures explícitas de desenvolvimento |
| `node/resolvers/instagramFeed.ts` | Leitura pública do último snapshot |
| `node/__tests__/*` | Normalização, credencial e persistência |
| `README.md` | Uso, segurança, API e integração |
| `TODO.md` | Pendências obrigatórias antes da produção |

---

## 🐛 Principais problemas corrigidos

| # | Problema | Causa | Correção |
| --- | --- | --- | --- |
| 1 | Rota de status inexistente durante build | Diagnóstico transitório do Builder Hub | Confirmado build final sem criar rota artificial |
| 2 | Leitura REST pública desnecessária | Arquitetura inicial duplicava superfície pública | Removida; leitura feita por GraphQL |
| 3 | Token não configurável com segurança | Mecanismo Node IO ainda não confirmado | App Settings privadas validadas na documentação |
| 4 | Sincronização retornava 403 | Policy voltada a chamadas entre apps | Resource-based policy para usuário Admin |
| 5 | Primeira sincronização falhava | Bucket VBase ausente | 404 inicial tratado como repositório vazio |
| 6 | Bloco não montava | Interface apontava para entrypoint incorreto | `component: "defaultApp"` |
| 7 | Título aparecia e sumia | Query React sem provider do app | `@context(provider: "sunhouse.instagram-feed")` |
| 8 | Estado permanecia `empty` | Leitura dependia de `listFiles`, que retornava 404 | Ponteiro estável `latest.json` lido diretamente |
| 9 | Slider quebrava com erro de CSS Handles | Objeto comum enviado em `classes` | Prop inválida removida |
| 10 | Builds incrementais quebravam | Builder adicionava JSON/GraphQL ao TypeScript | Link completo manual quando necessário |

---

## ✅ Validações executadas

### Backend e contrato

- [x] App Settings persistidas sem imprimir o valor.
- [x] Perfil Meta corresponde a `sunhousemoveis`.
- [x] ID retornado corresponde à conta Instagram esperada.
- [x] Consulta real retornou oito publicações.
- [x] `IMAGE`, `VIDEO` e `CAROUSEL_ALBUM` presentes.
- [x] Vídeos normalizados somente com thumbnail.
- [x] Limite final de oito itens.
- [x] Snapshot VBase relido com oito itens.
- [x] Falhas retornam categorias sanitizadas.

### Store Framework

- [x] App e tema linkados em `sunhouse/dev1`.
- [x] Dependência presente no tema.
- [x] Bloco presente na home após o fold.
- [x] Query GraphQL alcança o resolver com HTTP 200.
- [x] Feed real renderiza na home.
- [x] Erro de `SliderLayout.classes` corrigido.

### Checks locais

- [x] TypeScript React.
- [x] TypeScript Node.
- [x] Diagnósticos do editor sem erros introduzidos.
- [x] 3 suítes Node.
- [x] 12 testes automatizados.

### Não executado ou não afirmado

- [ ] Teste visual completo em desktop, tablet e mobile.
- [ ] Auditoria de requisições de imagem fora da viewport/clones.
- [ ] Comparação de LCP e CLS antes/depois.
- [ ] Validação em produção.
- [ ] Publicação, deploy ou promoção de workspace.

---

## 🔄 Pendências antes da produção

- [ ] Selecionar e configurar o scheduler externo para 09:00 e 19:00.
- [ ] Criar credencial VTEX própria para o scheduler.
- [ ] Definir rotação, expiração, monitoramento e reautorização do token Meta.
- [ ] Confirmar acesso avançado/App Review quando aplicável.
- [ ] Confirmar o ID principal do app Meta e vínculo ao portfólio Sun House.
- [ ] Revalidar o cronograma de descontinuação do VBase.
- [ ] Selecionar persistência futura após decisão de arquitetura e custo.
- [ ] Definir prazo máximo para servir dados antigos; 48 horas segue como
      proposta não aprovada.
- [ ] Refinar CSS, recorte, espaçamento e setas superiores.
- [ ] Validar desktop, tablet e mobile no tema real.
- [ ] Medir rede, LCP e CLS em condições equivalentes.
- [ ] Implementar CTA e modal somente em evolução futura.

---

## 📊 Relatório breve

| Métrica | Resultado |
| --- | --- |
| App | `sunhouse.instagram-feed@0.0.1` |
| Builders principais | React 3.x, Node 7.x, GraphQL 2.x, Store 0.x |
| Feed real | ✅ 8 publicações |
| Tipos reais validados | `IMAGE`, `VIDEO`, `CAROUSEL_ALBUM` |
| Credencial | App Setting privada |
| Persistência | VBase + `latest.json` + snapshots imutáveis |
| Leitura pública | GraphQL cacheável |
| Sincronização | Manual protegida; automática pendente |
| Carrossel | `vtex.slider-layout@0.x` |
| Testes | 12 passando em 3 suítes |
| Tema | `sunhouse.sunhouse@1.7.3` |
| Produção alterada | Não |

---

## 📚 Referências

- [VTEX Slider Layout](https://developers.vtex.com/docs/apps/vtex.slider-layout)
- [Creating an interface for app settings](https://developers.vtex.com/docs/guides/vtex-io-documentation-creating-an-interface-for-your-app-settings)
- [GraphQL builder](https://developers.vtex.com/docs/guides/vtex-io-documentation-graphql-builder)
- [GraphQL authorization in IO apps](https://developers.vtex.com/docs/guides/graphql-authorization-in-io-apps)
- [Implementing cache in GraphQL APIs for IO apps](https://developers.vtex.com/docs/guides/implementing-cache-in-graphql-apis-for-io-apps)
- [Consuming data in Store Framework](https://developers.vtex.com/docs/guides/vtex-io-documentation-7-consuming-data)
- [Controlling access to app resources](https://developers.vtex.com/docs/guides/controlling-access-to-app-resources)
- [Accessing external resources from VTEX IO](https://developers.vtex.com/docs/guides/accessing-external-resources-within-a-vtex-io-app)
- [VTEX IO service configuration](https://developers.vtex.com/docs/guides/vtex-io-documentation-service)
- [Using CSS Handles](https://developers.vtex.com/docs/guides/vtex-io-documentation-using-css-handles-for-store-customization)

