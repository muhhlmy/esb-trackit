import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'node:http'

test('Trusted Reverse Proxy Configuration & Real Client IP Resolution', async (t) => {
  await t.test('resolves real client IP when request passes through configured trusted proxy CIDR', async () => {
    const app = express()
    // Configure exact trusted proxy CIDR
    app.set('trust proxy', ['127.0.0.1/32', '172.28.0.0/16'])
    app.get('/api/test-ip', (req, res) => {
      res.json({
        ip: req.ip,
        ips: req.ips,
      })
    })

    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })

    try {
      const port = server.address().port
      // Client IP: 203.0.113.195 via trusted proxy 172.28.0.10
      const res = await fetch(`http://127.0.0.1:${port}/api/test-ip`, {
        headers: {
          'X-Forwarded-For': '203.0.113.195, 172.28.0.10',
        },
      })
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.equal(data.ip, '203.0.113.195')
      assert.deepEqual(data.ips, ['203.0.113.195', '172.28.0.10'])
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  await t.test('ignores spoofed X-Forwarded-For when trust proxy is disabled (empty string / false)', async () => {
    const app = express()
    // When trust proxy is false/disabled
    app.set('trust proxy', false)
    app.get('/api/test-ip', (req, res) => {
      res.json({
        ip: req.ip,
        ips: req.ips,
      })
    })

    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })

    try {
      const port = server.address().port
      const res = await fetch(`http://127.0.0.1:${port}/api/test-ip`, {
        headers: {
          'X-Forwarded-For': '198.51.100.25',
        },
      })
      assert.equal(res.status, 200)
      const data = await res.json()
      // Since trust proxy is false, req.ip must be the direct socket address (127.0.0.1), NOT 198.51.100.25
      assert.notEqual(data.ip, '198.51.100.25')
      assert.deepEqual(data.ips, [])
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})
