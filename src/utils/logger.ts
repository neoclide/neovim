import fs from 'fs'
import log4js from 'log4js'
import os from 'os'
import path from 'path'

export interface ILogger {
  debug: (data: string, ...meta: any[]) => void
  info: (data: string, ...meta: any[]) => void
  error: (data: string, ...meta: any[]) => void
  trace: (data: string, ...meta: any[]) => void
}

const MAX_LOG_SIZE = 1024 * 1024
const MAX_LOG_BACKUPS = 10
const LOG_FILE_PATH = process.env.NODE_CLIENT_LOG_FILE || path.join(os.tmpdir(), 'node-client.log')
const level = process.env.NODE_CLIENT_LOG_LEVEL || 'info'

if (level === 'debug') {
  fs.writeFileSync(LOG_FILE_PATH, '', 'utf8')
}

log4js.configure({
  appenders: {
    out: {
      type: 'file',
      filename: LOG_FILE_PATH,
      maxLogSize: MAX_LOG_SIZE,
      backups: MAX_LOG_BACKUPS,
      layout: {
        type: 'pattern',
        // Format log in following pattern:
        // yyyy-MM-dd HH:mm:ss.mil $Level (pid:$pid) $categroy - $message.
        pattern: `%d{ISO8601} %p (pid:${process.pid}) [%c] - %m`,
      },
    }
  },
  categories: {
    default: { appenders: ['out'], level }
  }
})

export function createLogger(name: string): ILogger {
  return log4js.getLogger(name)
}
