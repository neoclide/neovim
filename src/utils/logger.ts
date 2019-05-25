import fs from 'fs'
import os from 'os'
import path from 'path'

export interface ILogger {
  debug: (data: string, ...meta: any[]) => void
  info: (data: string, ...meta: any[]) => void
  error: (data: string, ...meta: any[]) => void
  trace: (data: string, ...meta: any[]) => void
}

const LOG_FILE_PATH = process.env.NODE_CLIENT_LOG_FILE || path.join(os.tmpdir(), 'node-client.log')
const level = process.env.NODE_CLIENT_LOG_LEVEL || 'info'

const isRoot = process.getuid && process.getuid() == 0
if (level === 'debug' && !isRoot) {
  fs.writeFileSync(LOG_FILE_PATH, '', 'utf8')
}

function toObject(arg: any): any {
  if (arg == null) {
    return arg
  }
  if (Array.isArray(arg)) {
    return arg.map(o => toObject(o))
  }
  if (typeof arg == 'object' && typeof arg.prefix == 'string' && typeof arg.data == 'number') {
    return '[' + arg.prefix + arg.data + ']'
  }
  return arg
}

function toString(arg: any): string {
  if (arg == null) return String(arg)
  if (typeof arg == 'object') return JSON.stringify(arg, null, 2)
  return String(arg)
}

let stream = fs.createWriteStream(LOG_FILE_PATH, { encoding: 'utf8' })

class Logger implements ILogger {
  constructor(private name: string) {
  }

  private getText(level: string, data: string, meta: any[]): string {
    let more = ''
    if (meta.length) {
      let arr = toObject(meta)
      more = ' ' + arr.map(o => toString(o))
    }
    return `${new Date().toLocaleTimeString()} ${level.toUpperCase()} [${this.name}] - ${data}${more}\n`
  }

  public debug(data: string, ...meta: any[]): void {
    if (level != 'debug' || isRoot) return
    stream.write(this.getText('debug', data, meta))
  }

  public info(data: string, ...meta: any[]): void {
    if (isRoot) return
    stream.write(this.getText('info', data, meta))
  }

  public error(data: string, ...meta: any[]): void {
    if (isRoot) return
    stream.write(this.getText('error', data, meta))
  }

  public trace(data: string, ...meta: any[]): void {
    if (level != 'debug' || isRoot) return
    stream.write(this.getText('trace', data, meta))
  }
}

export function createLogger(name: string): ILogger {
  return new Logger(name)
}
