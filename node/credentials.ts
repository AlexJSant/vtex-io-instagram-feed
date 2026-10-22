export interface InstagramRuntimeConfiguration {
  mode: 'meta'
  accessToken: string
}

export interface AppsSettingsClient {
  getAppSettings: (appId: string) => Promise<unknown>
}

function configurationError() {
  return Object.assign(new Error('Instagram credential is not configured'), {
    category: 'configuration' as const,
  })
}

export async function readRuntimeConfiguration(
  apps: AppsSettingsClient,
  appId = process.env.VTEX_APP_ID
): Promise<InstagramRuntimeConfiguration> {
  if (!appId) {
    throw configurationError()
  }

  let settings: unknown

  try {
    settings = await apps.getAppSettings(appId)
  } catch {
    throw configurationError()
  }

  if (!settings || typeof settings !== 'object') {
    throw configurationError()
  }

  const token = (settings as { instagramAccessToken?: unknown })
    .instagramAccessToken

  if (typeof token !== 'string' || !token.trim()) {
    throw configurationError()
  }

  return {
    mode: 'meta',
    accessToken: token.trim(),
  }
}
