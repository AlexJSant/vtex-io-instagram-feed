export interface InstagramRuntimeConfiguration {
  mode: 'meta'
  accessToken: string
}

export interface AppsSettingsClient {
  getAppSettings: (appId: string) => Promise<unknown>
}

const MINIMUM_SCHEDULER_SECRET_BYTES = 32

function configurationError() {
  return Object.assign(new Error('Instagram credential is not configured'), {
    category: 'configuration' as const,
  })
}

function schedulerConfigurationError() {
  return Object.assign(new Error('Scheduler configuration is unavailable'), {
    category: 'configuration' as const,
  })
}

async function readPrivateAppSettings(
  apps: AppsSettingsClient,
  appId: string | undefined,
  onError: () => Error
) {
  if (!appId) {
    throw onError()
  }

  try {
    const settings = await apps.getAppSettings(appId)

    if (!settings || typeof settings !== 'object') {
      throw onError()
    }

    return settings as Record<string, unknown>
  } catch {
    throw onError()
  }
}

export async function readRuntimeConfiguration(
  apps: AppsSettingsClient,
  appId = process.env.VTEX_APP_ID
): Promise<InstagramRuntimeConfiguration> {
  const settings = await readPrivateAppSettings(apps, appId, configurationError)

  const token = settings.instagramAccessToken

  if (typeof token !== 'string' || !token.trim()) {
    throw configurationError()
  }

  return {
    mode: 'meta',
    accessToken: token.trim(),
  }
}

export async function readSchedulerSyncSecret(
  apps: AppsSettingsClient,
  appId = process.env.VTEX_APP_ID
): Promise<string> {
  const settings = await readPrivateAppSettings(
    apps,
    appId,
    schedulerConfigurationError
  )

  const secret = settings.schedulerSyncSecret

  if (
    typeof secret !== 'string' ||
    Buffer.byteLength(secret, 'utf8') < MINIMUM_SCHEDULER_SECRET_BYTES
  ) {
    throw schedulerConfigurationError()
  }

  return secret
}
