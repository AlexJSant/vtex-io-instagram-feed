# Instagram Feed App

<!-- DOCS-IGNORE:start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- DOCS-IGNORE:end -->

📢 Use this project, [contribute](https://github.com/AlexJSant/vtex-io-instagram-feed) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

VTEX IO / Store Framework app that reads a persisted Instagram snapshot and renders up to eight posts in the official `vtex.slider-layout` carousel.

## Configuration

This repository does not contain the store theme. To render the feed:

1. Add the app as a theme dependency in the theme `manifest.json`.
2. Declare the `instagram-feed` block in a theme template, or inside another block from the theme. The example below targets the second fold of the home page.

```json
{
  "dependencies": {
    "{{vendor}}.instagram-feed": "0.x"
  }
}
```

```json
{
  "instagram-feed#home": {
    "props": {
      "title": "Acompanhe o nosso Instagram",
      "allowDevelopmentFixtures": false
    }
  }
}
```

| Block name         | Description                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `instagram-feed`   | Renders up to eight posts from the latest valid Instagram snapshot in a `vtex.slider-layout` carousel.         |

### `instagram-feed` props

| Prop name                   | Type      | Description                                                                                                                                                                                                 | Default value                              |
| --------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `title`                     | `string`  | Heading rendered above the carousel. The same value is the section `aria-label`.                                                                                                                           | `Acompanhe o nosso Instagram`       |
| `allowDevelopmentFixtures`  | `boolean` | When `true`, the block may render a snapshot whose `source` is `"fixture"`. Fixtures are blocked by default. Do not use this prop as a production fallback. Keep it `false` outside development.         | `false`                                    |

To preview fixtures in a development workspace, send an authenticated `POST` to:

```text
/_v/{{vendor}}/instagram-feed/sync?source=fixture
```

Then enable `allowDevelopmentFixtures` temporarily. The `source=fixture` parameter is ignored on the `master` workspace.

The block already reserves an initial layout of four 4:5 cards. If the theme defers the entire block with a lazy-rendering mechanism, the theme container must reserve that same area. A skeleton that mounts only after the deferral does not reserve space on its own.

`instagramAccessToken` and `schedulerSyncSecret` are required before a real Meta sync. Both are private App Settings. See [Credentials](#credentials).

> **First use:** adding the block to the theme does not fetch Instagram
> directly. The block only reads the latest snapshot already persisted by the
> Node service. After installing and configuring the app in a workspace, run
> the Google Cloud Scheduler job once (or wait for its first successful
> scheduled execution) before validating the block on the storefront. Until
> that first successful `POST`, no `latest.json` snapshot exists and the block
> renders its empty state. A manual sync is available for diagnostics and
> recovery, but it is not part of the normal startup flow.

## Modus Operandi

### Current behavior

- Store Framework block: `instagram-feed`.
- Node `7.x` service with a cacheable public GraphQL query and a protected manual sync.
- Media is normalized for `IMAGE`, `VIDEO`, and `CAROUSEL_ALBUM`.
- Videos expose only `thumbnail_url`. The public contract does not include the access token, a video URL, the raw Meta response, or unnecessary child media.
- VBase persistence is isolated between `development` and `production`.
- Snapshots are immutable. Readers resolve the current snapshot through `latest.json`, which is updated only after a `syncStartedAt` comparison and a conditional write (`ETag` / `If-Match`). That prevents an older run from replacing a newer one.
- Fixtures are opt-in. They are marked with `source: "fixture"` and the component blocks them by default.

### API

- `instagramFeed`, on the app GraphQL API: reads only the latest valid snapshot. The query is defined with GraphQL builder `2.x` and is annotated with `@auth(scope: PUBLIC)` and `@cacheControl(scope: PUBLIC, maxAge: 300)`.
- `POST /_v/{{vendor}}/instagram-feed/sync`: private route protected by a resource-based policy. The policy allows `POST` only for the administrative operator explicitly listed in it. A visit to the home page never calls this route.
- `POST /_v/{{vendor}}/instagram-feed/sync-scheduler`: dedicated external entry point for Google Cloud Scheduler. On the Node `7.x` transport the route is public, so it does not require a VTEX identity. The middleware still requires the `X-Sunhouse-Scheduler-Token` header before it creates the repository or starts a sync. Any other method returns `405`. Missing or invalid credentials return `401`. Unavailable configuration returns `503`.

The block reads the query through React Apollo, which is the integration VTEX recommends between Store Framework and the app backend. The former public route `GET /_v/{{vendor}}/instagram-feed` has been removed. The `@auth` directive controls access. `@cacheControl` controls caching and does not replace authorization.

The storefront never starts a synchronization. This separation keeps the Meta
token and upstream latency out of the rendering path. Consequently, installing
the app or declaring the block does not create the initial snapshot: the
Scheduler must complete at least one successful call in each target environment.

The Meta client calls only `https://graph.instagram.com/v25.0`. It sends the token in the `Authorization` header and applies a timeout and a bounded retry policy. Pagination reuses only the `after` cursor and does not follow URLs returned in the response.

### Credentials

`instagramAccessToken` and `schedulerSyncSecret` are **private App Settings**. The `settingsSchema` does not set `access` to `"public"`, so these settings are not returned by `publicSettingsForApp`. The Node service reads them with `ctx.clients.apps.getAppSettings(process.env.VTEX_APP_ID)`.

After the app has been linked manually in the development workspace:

1. In the same VTEX account, open **Apps > App Management** in the Admin.
2. Open **Instagram Feed App** and its settings page.
3. Enter the token directly in **Meta App Instagram - Access token** (`instagramAccessToken`).
4. Generate `schedulerSyncSecret` from at least 32 random bytes using a cryptographically secure source. Enter it in **Google Cloud Scheduler - Secret for Cron sync** (`schedulerSyncSecret`) and save. For example, run `openssl rand -base64 32` locally and transfer the result directly to the VTEX Admin and to Secret Manager.
5. Trigger the Google Cloud Scheduler job once and confirm a successful initial
   snapshot before validating the storefront. Use the manual sync route without
   `source=fixture` only for diagnostics or recovery.

Do not share either value in chat, and do not add them to source code, Git, the frontend, GraphQL, URLs, fixtures, logs, or VBase. Do not reuse the Meta access token as the scheduler secret. The `password` format masks the field in the Admin UI. It does not replace administrative access control, rotation, or revocation.

Fixtures remain available without App Settings, but only through the protected route and only outside the `master` workspace.

On failure, logs omit request headers, pagination URLs, the access token, and the raw Meta body.

### Scheduling

Node IO does not expose a native durable cron API with timezone support. Events declared in `service.json` are reactive consumers, not schedulers. Google Cloud Scheduler must call:

```text
POST https://{{workspace}}--{{account}}.myvtex.com/_v/{{vendor}}/instagram-feed/sync-scheduler
X-Sunhouse-Scheduler-Token: <SECRET>
empty body
```

`{{workspace}}` is the exact workspace targeted by the job, `{{account}}` is
the VTEX account, `{{vendor}}` is the app vendor, and `<SECRET>` is the
`schedulerSyncSecret` value. The Scheduler URL does not follow workspace
changes automatically: create or update the job to point to the environment
whose snapshot must be refreshed. Configure the job without a Google OIDC or
OAuth token. Protect the job configuration with least-privilege IAM. Restrict
who can read or edit its headers, and never send the secret in the query string.
This route ignores `source=fixture` and always syncs from Meta.

For the first use of the block, force one execution of this job or wait for its
first scheduled run. Treat the bootstrap as complete only when the endpoint
returns HTTP `200` with `ok: true` and `persistedItemCount` greater than zero.
Before that, the expected storefront result is an empty placeholder, because
there is no persisted snapshot to read. Responses `401` and `503` indicate,
respectively, invalid Scheduler authentication or an unavailable
configuration/upstream/persistence operation.

Before production, publish the approved version, save the App Settings on the production installation, point the job at the production domain, measure the real duration in order to set the timeout and retry policy, and configure monitoring. The route responds only after persistence completes. The scheduler must treat any non-`2xx` response as a failure.

### Development

```sh
yarn lint
yarn typecheck
yarn test
```

Before `vtex link`, confirm the account and the workspace explicitly, and continue only in a development workspace. Do not publish or promote this app during validation.

See [TODO.md](TODO.md) for the decisions that are mandatory before production. The technical history of the implementation is in [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md).

### VTEX references

- [Creating an interface for your app settings](https://developers.vtex.com/docs/guides/vtex-io-documentation-creating-an-interface-for-your-app-settings)
- [GraphQL builder](https://developers.vtex.com/docs/guides/vtex-io-documentation-graphql-builder)
- [GraphQL authorization in IO apps](https://developers.vtex.com/docs/guides/graphql-authorization-in-io-apps)
- [Implementing cache in GraphQL APIs for IO apps](https://developers.vtex.com/docs/guides/implementing-cache-in-graphql-apis-for-io-apps)
- [Consuming data in Store Framework](https://developers.vtex.com/docs/guides/vtex-io-documentation-7-consuming-data)
- [VTEX IO CLI command reference](https://developers.vtex.com/docs/guides/vtex-io-documentation-vtex-io-cli-command-reference)
- [Workspace types](https://developers.vtex.com/docs/guides/vtex-io-documentation-workspace)
- [Creating a Production workspace](https://developers.vtex.com/docs/guides/vtex-io-documentation-creating-a-production-workspace)
- [FastStore/WebOps variables and secrets](https://developers.vtex.com/docs/guides/faststore/webops-managing-variables-and-secrets)

## Customization

In order to apply CSS customizations in this and other blocks, follow the instructions given in the recipe on [Using CSS Handles for store customization](https://vtex.io/docs/recipes/style/using-css-handles-for-store-customization).

| CSS Handles          |
| -------------------- |
| `card`               |
| `carousel`           |
| `container`          |
| `developmentNotice`  |
| `heading`            |
| `image`              |
| `placeholder`        |
| `skeleton`           |
| `skeletonCard`       |
| `title`              |

<!-- DOCS-IGNORE:start -->

## Contributors ✨

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome!

<!-- DOCS-IGNORE:end -->

----

Check out some documentation models that are already live:

- [Breadcrumb](https://github.com/vtex-apps/breadcrumb)
- [Image](https://vtex.io/docs/components/general/vtex.store-components/image)
- [Condition Layout](https://vtex.io/docs/components/all/vtex.condition-layout@1.1.6/)
- [Add To Cart Button](https://vtex.io/docs/components/content-blocks/vtex.add-to-cart-button@0.9.0/)
- [Store Form](https://vtex.io/docs/components/all/vtex.store-form@0.3.4/)
