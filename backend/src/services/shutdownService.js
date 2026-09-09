/** Stop accepting requests, drain long-lived streams, then await HTTP closure. */
export async function drainHttpServer(server, closeStreams) {
  const closed = new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  // Requests active when close() is called may become idle afterwards.
  // Reap only those idle sockets; let unfinished HTTP responses drain normally.
  const idleReaper = setInterval(() => server.closeIdleConnections?.(), 50)
  idleReaper.unref()
  try {
    try {
      closeStreams()
    } catch (error) {
      server.closeAllConnections?.()
      await closed
      throw error
    }
    await closed
  } finally {
    clearInterval(idleReaper)
  }
}
