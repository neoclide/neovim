import fs, { WriteStream } from 'fs'
import os from 'os'
import path from 'path'

export interface ILogger {
  debug: (data: string, ...meta: any[]) => void
  info: (data: string, ...meta: any[]) => void
  error: (data: string, ...meta: any[]) => void
  trace: (data: string, ...meta: any[]) => void
}

function getLogFile(): string {
  let file = process.env.NODE_CLIENT_LOG_FILE
  if (file) return file
  let dir = process.env.XDG_RUNTIME_DIR
  if (dir) return path.join(dir, 'node-client.log')
  return path.join(os.tmpdir(), `node-client-${process.pid}.log`)
}

const LOG_FILE_PATH = getLogFile()
const level = process.env.NODE_CLIENT_LOG_LEVEL || 'info'

let invalid = process.getuid && process.getuid() == 0
if (!invalid) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE_PATH), { recursive: true })
    fs.writeFileSync(LOG_FILE_PATH, '', { encoding: 'utf8', mode: 0o666 })
  } catch (_e) {
    invalid = true
  }
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

function toTimeString(d: Date): string {
  return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`
}

class Logger implements ILogger {
  private _stream: WriteStream
  constructor(private name: string) {
  }

  private get stream(): WriteStream {
    if (invalid) return null
    if (this._stream) return this._stream
    this._stream = fs.createWriteStream(LOG_FILE_PATH, { encoding: 'utf8' })
    return this._stream
  }

  private getText(level: string, data: string, meta: any[]): string {
    let more = ''
    if (meta.length) {
      let arr = toObject(meta)
      more = ' ' + arr.map(o => toString(o))
    }
    return `${toTimeString(new Date())} ${level.toUpperCase()} [${this.name}] - ${data}${more}\n`
  }

  public debug(data: string, ...meta: any[]): void {
    if (level != 'debug' || this.stream == null) return
    this.stream.write(this.getText('debug', data, meta))
  }

  public info(data: string, ...meta: any[]): void {
    if (this.stream == null) return
    this.stream.write(this.getText('info', data, meta))
  }

  public error(data: string, ...meta: any[]): void {
    if (this.stream == null) return
    this.stream.write(this.getText('error', data, meta))
  }

  public trace(data: string, ...meta: any[]): void {
    if (level != 'trace' || this.stream == null) return
    this.stream.write(this.getText('trace', data, meta))
  }
}

export function createLogger(name: string): ILogger {
  return new Logger(name)
}
