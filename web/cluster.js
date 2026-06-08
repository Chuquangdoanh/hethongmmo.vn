'use strict';

const cluster = require('cluster');
const os = require('os');

// Dùng || thay vì ?? để empty string "" cũng fallback về os.cpus().length
const numWorkers = parseInt(process.env.CLUSTER_WORKERS || String(os.cpus().length), 10);

if (cluster.isPrimary) {
  console.log(`[cluster] Primary ${process.pid} — forking ${numWorkers} workers (${os.cpus().length} CPUs available)`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // Auto-restart crashed workers (only when NOT shutting down)
  let shuttingDown = false;
  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return;
    console.warn(`[cluster] Worker ${worker.process.pid} exited (${signal ?? code}) — restarting in 1s`);
    setTimeout(() => cluster.fork(), 1_000);
  });

  // Graceful shutdown: give workers up to 30s to drain in-flight requests
  // Docker sends SIGTERM 35s before SIGKILL (stop_grace_period: 35s in compose)
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[cluster] ${signal} received — graceful shutdown started`);

    const workers = Object.values(cluster.workers ?? {});
    let remaining = workers.length;

    if (remaining === 0) {
      process.exit(0);
    }

    // Disconnect all workers so they stop accepting new connections
    for (const worker of workers) {
      worker.disconnect();
    }

    // Force kill any worker that doesn't exit within 30s
    const forceKillTimer = setTimeout(() => {
      console.warn('[cluster] Force killing remaining workers after timeout');
      for (const worker of Object.values(cluster.workers ?? {})) {
        if (!worker.isDead()) worker.process.kill('SIGKILL');
      }
      process.exit(1);
    }, 30_000);
    forceKillTimer.unref();

    cluster.on('exit', () => {
      remaining -= 1;
      if (remaining === 0) {
        console.log('[cluster] All workers exited cleanly');
        clearTimeout(forceKillTimer);
        process.exit(0);
      }
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
} else {
  require('./server.js');
}
