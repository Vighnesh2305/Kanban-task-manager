import path from "path"
import fs from "fs"
import os from "os"
import react from "@vitejs/plugin-react"
import { defineConfig, Plugin } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'

function syncServerPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, './.data')
  const dbFile = path.resolve(dataDir, 'db.json')

  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }) } catch { /* ignore */ }
  }

  let db: Record<string, any> = {}
  if (fs.existsSync(dbFile)) {
    try {
      db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'))
    } catch {
      db = {}
    }
  }

  const sseClients: Set<any> = new Set()

  return {
    name: 'sync-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]

        // 1. SSE Stream for cross-device real-time sync
        if (url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          })
          res.write('data: {"type":"CONNECTED"}\n\n')
          sseClients.add(res)
          req.on('close', () => sseClients.delete(res))
          return
        }

        // 2. GET /api/sync - get full or specific key
        if (url === '/api/sync' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify(db))
          return
        }

        // 2b. GET /api/network-ip - get LAN IP for sharing links across devices on same Wi-Fi
        if (url === '/api/network-ip' && req.method === 'GET') {
          const nets = os.networkInterfaces()
          let lanIp = 'localhost'
          for (const name of Object.keys(nets)) {
            for (const net of nets[name] || []) {
              if (net.family === 'IPv4' && !net.internal && (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.'))) {
                lanIp = net.address
                break
              }
            }
            if (lanIp !== 'localhost') break
          }
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ ip: lanIp, port: 5173 }))
          return
        }

        // 3. POST /api/sync - update key-value store and notify all clients
        if (url === '/api/sync' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              if (data && typeof data === 'object') {
                Object.assign(db, data)
                try {
                  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2))
                } catch {
                  // ignore
                }

                // Broadcast SSE to all connected devices
                const payload = JSON.stringify({ type: 'SYNC_UPDATE', data })
                for (const client of sseClients) {
                  try {
                    client.write(`data: ${payload}\n\n`)
                  } catch {
                    sseClients.delete(client)
                  }
                }
              }
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              })
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    syncServerPlugin(),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
