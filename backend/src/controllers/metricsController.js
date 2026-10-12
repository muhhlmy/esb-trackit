import { query } from '../config/database.js';

let requestCounter = {
  total: 0,
  byStatus: {},
};

export function recordMetricRequest(status) {
  requestCounter.total++;
  const key = String(status);
  requestCounter.byStatus[key] = (requestCounter.byStatus[key] || 0) + 1;
}

export async function getPrometheusMetrics(req, res) {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const cpu = process.cpuUsage();

  let dbHealthy = 1;
  try {
    await query('SELECT 1');
  } catch {
    dbHealthy = 0;
  }

  const lines = [
    '# HELP process_uptime_seconds The uptime of the Node.js process in seconds.',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${uptime.toFixed(3)}`,
    '',
    '# HELP process_resident_memory_bytes Resident memory size in bytes.',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes ${mem.rss}`,
    '',
    '# HELP process_heap_used_bytes Heap memory used in bytes.',
    '# TYPE process_heap_used_bytes gauge',
    `process_heap_used_bytes ${mem.heapUsed}`,
    '',
    '# HELP process_heap_total_bytes Total heap memory allocated in bytes.',
    '# TYPE process_heap_total_bytes gauge',
    `process_heap_total_bytes ${mem.heapTotal}`,
    '',
    '# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.',
    '# TYPE process_cpu_user_seconds_total counter',
    `process_cpu_user_seconds_total ${(cpu.user / 1e6).toFixed(4)}`,
    '',
    '# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.',
    '# TYPE process_cpu_system_seconds_total counter',
    `process_cpu_system_seconds_total ${(cpu.system / 1e6).toFixed(4)}`,
    '',
    '# HELP trackit_database_healthy PostgreSQL connectivity status (1 = healthy, 0 = unhealthy).',
    '# TYPE trackit_database_healthy gauge',
    `trackit_database_healthy ${dbHealthy}`,
    '',
    '# HELP nodejs_version_info Node.js runtime version metadata.',
    '# TYPE nodejs_version_info gauge',
    `nodejs_version_info{version="${process.version}"} 1`,
  ];

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
}
