import process from 'node:process'
import { createServer } from 'vite'

async function start() {
  try {
    const server = await createServer({
      configFile: './vite.config.js',
    })
    await server.listen()
    console.log('Persistent Vite dev server is running!')
    if (server.printUrls) {
      server.printUrls()
    }
    // Maintain event loop indefinitely (immune to stdin close/EOF)
    setInterval(() => {}, 2147483647)
  } catch (error) {
    console.error('Failed to start Vite dev server:', error)
    process.exit(1)
  }
}

start()
