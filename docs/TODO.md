# Pendências antes da produção

- [x] Implementar App Settings privadas para o token, sem
      `access: "public"`, e leitura exclusiva no Node por
      `ctx.clients.apps.getAppSettings(process.env.VTEX_APP_ID)`.
- [x] Cadastrar `instagramAccessToken` diretamente em **Apps > App Management**
      e confirmar pela API privada de Apps que o valor persistido é uma string
      não vazia, sem imprimir ou retornar seu conteúdo.
- [x] Executar a sincronização manual real: 8 publicações Meta foram
      normalizadas e persistidas no VBase de desenvolvimento em 21/10/2026.
      Renderização no tema confirmada no mesmo dia.
- [x] Revisar os acessos administrativos às App Settings e documentar rotação e
      revogação. Concluído em 29/10/2026: quem acessa a tela de apps da loja tem
      autonomia para trocar esses valores, e a VTEX não oferece restrição mais
      fina. O formato `password` mascara a interface. Não copiar o token para
      frontend, GraphQL, VBase, `vtex.env`, `secrets.revealed.json` ou
      `secrets.hidden.json`.
- [x] Revalidar a leitura real após a publicação do app Meta para o perfil
      `sunhousemoveis`; `/me/media` retornou oito itens em 21/10/2026.
- [x] Confirmar acesso avançado/App Review quando aplicável. Confirmado em
      29/10/2026.
- [x] Validar a presença de `CAROUSEL_ALBUM` real e capas de vídeo na resposta.
- [x] Validar visualmente o carregamento das URLs de mídia no tema.
- [ ] Definir expiração, renovação, monitoramento e reautorização do token.
- [x] Confirmar o ID principal do aplicativo Meta e o vínculo final ao
      portfólio Sun House, em 29/10/2026. `1209394875373919` é somente o ID
      específico do app Instagram.
- [x] Implementar entrada dedicada ao Google Cloud Scheduler, sem identidade
      VTEX, autenticada no middleware por `schedulerSyncSecret` privado e sem
      aceitar fixtures.
- [x] Cadastrar um `schedulerSyncSecret` de pelo menos 32 bytes aleatórios nas
      App Settings de cada instalação e no header protegido do job. Acesso IAM,
      rotação, revogação e auditoria definidos em 29/10/2026, sem reutilizar o
      token Meta.
- [x] Rota de produção do Google Cloud Scheduler, definida em 29/10/2026: POST
      `https://sunhouse.myvtex.com/_v/sunhouse/instagram-feed/sync-scheduler`,
      sem OIDC/OAuth e com corpo vazio. Esse host é o workspace `master`. A
      rota manual permanece para bootstrap e recuperação.
- [ ] Revisar a separação de persistência por ambiente. Atualmente
      `workspace === "master"` seleciona `production/` e qualquer outro nome,
      inclusive um workspace VTEX do tipo production, seleciona `development/`.
      Identificar uma fonte confiável para o tipo real do workspace, definir a
      estratégia de migração dos snapshots existentes e cobrir development,
      production nomeado e master com testes.
- [ ] Tornar o estado de sincronização observável no contrato GraphQL e no
      frontend. Diferenciar claramente “ainda não sincronizado”, “snapshot
      vazio” e “falha ao ler o VBase”; hoje uma exceção de leitura é convertida
      na mesma resposta vazia usada antes do primeiro snapshot.
- [ ] Não renderizar o bloco quando o estado do feed for `empty`, evitando que
      seu contêiner reserve espaço vazio na página. Decidir se o comportamento
      será implementado no componente ou no tema via CSS.
- [ ] Definir monitoramento do bootstrap e das execuções recorrentes: validar
      `ok`, `itemCount`, `persistedItemCount` e `lastSyncedAt`, alertar para
      ausência prolongada de sucesso e documentar um procedimento de
      recuperação. Avaliar um endpoint de status que não exponha segredos.
- [ ] Revisar a política de cache do estado sem snapshot. O GraphQL usa cache
      público de 300 segundos e o React usa `cache-first`; garantir que uma
      resposta vazia anterior ao primeiro sync não atrase indevidamente a
      exibição após o bootstrap.
- [ ] Remover ou justificar configurações específicas da Sun House no código:
      perfil Meta esperado, vendor nas rotas e operador administrativo. Avaliar
      configuração segura por instalação e testes que impeçam sincronizar a
      conta errada sem reduzir a proteção atual.
- [ ] Adicionar testes de integração do ciclo completo por ambiente:
      instalação/configuração, primeiro POST do Scheduler, persistência,
      consulta GraphQL, cache e renderização. Incluir respostas `401`, `503`,
      snapshot inexistente e falha de leitura.
- [x] Proteger a sincronização manual com resource-based policy REST para o
      operador administrativo `alex@sunhouse.com.br`. A configuração anterior
      por `workspace-read-write` era uma role-based policy voltada a chamadas
      entre apps e retornava HTTP 403 para o usuário Admin.
- [ ] Revalidar o cronograma oficial do VBase e migrar a persistência para
      Master Data ou alternativa externa após nova decisão de arquitetura e custo.
      Em 21/10/2026, a VTEX informa bloqueios graduais em 01/02/2027 e 01/07/2027
      e desligamento em 01/10/2027; não foi presumida nenhuma exceção.
- [ ] Decidir o prazo máximo de dados antigos. A proposta de 48 horas ainda não
      está aplicada; enquanto isso, a última sincronização válida continua
      disponível.
- [x] Refinar recorte, espaçamentos e validação visual em desktop, tablet e
      mobile no tema real. Concluído em 29/10/2026.
- [ ] Medir rede, LCP e CLS antes/depois em condições equivalentes. Skeleton não
      é evidência automática de melhoria.
- [ ] Evoluções futuras, fora do MVP: CTA e legenda.
- [ ] Evolução futura, fora do MVP: ao clicar na imagem, abrir o post em um modal
      com iframe, mantendo o botão "ver no instagram" em aba nova. Não alterar
      o comportamento atual até validar em loja. O permalink exato (`/p/` e
      `/reel/`) não pode ser encaixado: o Instagram bloqueia framing por
      `frame-ancestors`. Usar a URL oficial de embed (`/embed/` ou
      `/embed/captioned/`) dentro de um único `vtex.modal-layout`, irmão da
      lista e fora dos slides, com o iframe montado só enquanto o modal estiver
      aberto. O card do perfil (`sunhousemoveis`) continua só como aba nova.
      Validar reel indisponível, `frame-src` da loja, rolagem no iOS, foco ao
      fechar e consentimento de cookie da Meta antes de implementar.
