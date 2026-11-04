export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const upstream = config.apiUpstream.replace(/\/$/, '')
  // Keep the API path and query while forwarding request bodies and session cookies.
  try {
    return await proxyRequest(event, `${upstream}${event.path}`)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Server API tidak dapat dihubungi. Pastikan layanan API berjalan.'
    })
  }
})
