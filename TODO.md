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
- [ ] Revisar os acessos administrativos às App Settings e documentar rotação e
      revogação. O formato `password` mascara a interface, mas não substitui
      esses controles. Não copiar o token para frontend, GraphQL, VBase,
      `vtex.env`, `secrets.revealed.json` ou `secrets.hidden.json`.
- [x] Revalidar a leitura real após a publicação do app Meta para o perfil
      `sunhousemoveis`; `/me/media` retornou oito itens em 21/10/2026.
- [ ] Confirmar acesso avançado/App Review quando aplicável.
- [x] Validar a presença de `CAROUSEL_ALBUM` real e capas de vídeo na resposta.
- [x] Validar visualmente o carregamento das URLs de mídia no tema.
- [ ] Definir expiração, renovação, monitoramento e reautorização do token.
- [ ] Confirmar o ID principal do aplicativo Meta e o vínculo final ao
      portfólio Sun House. `1209394875373919` é somente o ID específico do app
      Instagram.
- [ ] Selecionar o agendador externo entre a infraestrutura já existente da Sun
      House, Google Cloud Scheduler, AWS EventBridge Scheduler ou GitHub Actions.
      Configurar execuções às 09:00 e 19:00 em `America/Sao_Paulo`, credencial
      VTEX de integração própria (AppKey/AppToken) armazenada no cofre do
      scheduler, principal exato na resource-based policy, headers protegidos,
      timeout, retry progressivo, monitoramento e alerta. Nunca armazenar ou
      transmitir o token Meta ao scheduler. A rota manual deve permanecer apenas
      para bootstrap e recuperação.
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
- [ ] Refinar recorte, espaçamentos e validação visual em desktop, tablet e
      mobile no tema real.
- [ ] Medir rede, LCP e CLS antes/depois em condições equivalentes. Skeleton não
      é evidência automática de melhoria.
- [ ] Evoluções futuras, fora do MVP: CTA, legenda e modal.
