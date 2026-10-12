import cluster from 'node:cluster';
import os from 'node:os';

const numCPUs = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
const defaultWorkers = Math.max(2, Math.min(numCPUs, 8));
export const workerCount = parseInt(process.env.WEB_CONCURRENCY || process.env.WORKER_COUNT || defaultWorkers, 10);

export function startCluster(customWorkerCount = workerCount) {
  if (cluster.isPrimary) {
    console.log(`[LoadBalancer:Master] PID ${process.pid} orchestrating ${customWorkerCount} workers across ${numCPUs} CPU cores...`);

    let isShuttingDown = false;
    const workers = new Set();

    for (let i = 0; i < customWorkerCount; i++) {
      const worker = cluster.fork();
      workers.add(worker);
    }

    cluster.on('online', (worker) => {
      console.log(`[LoadBalancer:Worker] Worker PID ${worker.process.pid} online and accepting connections.`);
    });

    cluster.on('exit', (worker, code, signal) => {
      workers.delete(worker);
      if (isShuttingDown) {
        return;
      }
      console.warn(`[LoadBalancer:Worker] Worker PID ${worker.process.pid} exited (code: ${code}, signal: ${signal}). Auto-respawning replacement worker...`);
      const newWorker = cluster.fork();
      workers.add(newWorker);
    });

    const shutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[LoadBalancer:Master] ${signal} received. Draining all workers gracefully...`);

      for (const worker of workers) {
        worker.process.kill(signal);
      }

      const forceTimer = setTimeout(() => {
        console.error('[LoadBalancer:Master] Force killing non-responsive workers after 10s...');
        for (const worker of workers) {
          worker.kill('SIGKILL');
        }
        process.exit(1);
      }, 10_000);
      forceTimer.unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    return { masterPid: process.pid, workers };
  } else {
    // Worker processes import the server to handle incoming requests
    import('./server.js');
  }
}

// Auto-run if executed directly as entrypoint
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  startCluster();
}
