import { readRuntimeConfiguration } from '../credentials'

describe('readRuntimeConfiguration', () => {
  it('reads a fictitious token from private app settings', async () => {
    const getAppSettings = jest.fn().mockResolvedValue({
      instagramAccessToken: ' test-token-not-a-secret ',
    })

    await expect(
      readRuntimeConfiguration(
        { getAppSettings },
        'sunhouse.instagram-feed@0.0.1'
      )
    ).resolves.toEqual({
      mode: 'meta',
      accessToken: 'test-token-not-a-secret',
    })

    expect(getAppSettings).toHaveBeenCalledWith(
      'sunhouse.instagram-feed@0.0.1'
    )
  })

  it.each([
    ['missing settings', {}],
    ['empty token', { instagramAccessToken: '  ' }],
    ['invalid token type', { instagramAccessToken: 123 }],
  ])('rejects %s as a configuration error', async (_name, settings) => {
    await expect(
      readRuntimeConfiguration(
        { getAppSettings: jest.fn().mockResolvedValue(settings) },
        'sunhouse.instagram-feed@0.0.1'
      )
    ).rejects.toMatchObject({
      category: 'configuration',
    })
  })

  it('does not expose a settings client error', async () => {
    const providerError = new Error('response containing sensitive details')

    await expect(
      readRuntimeConfiguration(
        { getAppSettings: jest.fn().mockRejectedValue(providerError) },
        'sunhouse.instagram-feed@0.0.1'
      )
    ).rejects.toMatchObject({
      message: 'Instagram credential is not configured',
      category: 'configuration',
    })
  })

})
