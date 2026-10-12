import test from 'node:test';
import assert from 'node:assert/strict';
import { workerCount } from '../src/cluster.js';
import fs from 'node:fs';
import path from 'node:path';

test('High-Availability Cluster & Load Balancer Infrastructure Suite', async (t) => {
  await t.test('1. Cluster calculates optimal worker count based on CPU architecture', () => {
    assert.equal(typeof workerCount, 'number');
    assert.ok(workerCount >= 2, 'Worker count should be at least 2 for High Availability');
  });

  await t.test('2. NGINX Load Balancer configuration file exists and contains essential directives', () => {
    const nginxConfPath = path.resolve('..', 'deploy', 'nginx', 'load-balancer.conf');
    assert.ok(fs.existsSync(nginxConfPath), 'load-balancer.conf must exist in deploy/nginx/');

    const content = fs.readFileSync(nginxConfPath, 'utf8');
    assert.ok(content.includes('upstream trackit_backend_cluster'), 'Must define backend upstream pool');
    assert.ok(content.includes('least_conn;'), 'Must use least_conn load balancing algorithm');
    assert.ok(content.includes('keepalive 64;'), 'Must configure upstream keepalive');
    assert.ok(content.includes('location /health/'), 'Must configure health check location');
    assert.ok(content.includes('location /api/tickets/events'), 'Must configure SSE streaming location');
    assert.ok(content.includes('proxy_buffering off;'), 'SSE must disable proxy buffering');
    assert.ok(content.includes('proxy_set_header X-Forwarded-For'), 'Must forward real client IP');
  });

  await t.test('3. High-Availability Docker Compose configuration exists and configures multi-replica backend', () => {
    const composePath = path.resolve('..', 'docker-compose.ha.yml');
    assert.ok(fs.existsSync(composePath), 'docker-compose.ha.yml must exist');

    const content = fs.readFileSync(composePath, 'utf8');
    assert.ok(content.includes('trackit-load-balancer'), 'Must define load balancer service');
    assert.ok(content.includes('trackit-backend-1'), 'Must define backend replica 1');
    assert.ok(content.includes('trackit-backend-2'), 'Must define backend replica 2');
    assert.ok(content.includes('service_healthy'), 'Must depend on healthy healthcheck probes');
  });
});
