import { EventEmitter } from 'events'
import { createLogger } from '../utils/logger'
import { NeovimClient } from '../api'
const debug = process.env.NODE_CLIENT_LOG_LEVEL == 'debug'
const logger = createLogger('transport')

export interface Response {
  send: (resp: any, isError?: boolean) => void
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

export default abstract class Transport extends EventEmitter {
  protected _paused = false
  protected paused: [string, any[]][] = []

  protected debug(key: string, ...meta: any[]): void {
    if (!debug) return
    logger.debug(key, ...meta.map(o => toObject(o)))
  }

  protected debugMessage(msg: any[]): void {
    if (!debug) return
    const msgType = msg[0]
    if (msgType == 0) {
      logger.debug('receive request:', toObject(msg.slice(1)))
    } else if (msgType == 1) {
      logger.debug('receive response:', toObject(msg.slice(1)))
    } else if (msgType == 2) {
      logger.debug('receive notification:', toObject(msg.slice(1)))
    } else {
      logger.debug('unknown message:', msg)
    }
  }

  public pauseNotification(): void {
    this._paused = true
  }

  public resumeNotification(): Promise<void>
  public resumeNotification(isNotify: true): null
  public resumeNotification(isNotify = false): Promise<void> | null {
    this._paused = false
    let list = this.paused
    if (list.length) {
      this.paused = []
      return new Promise<void>((resolve, reject) => {
        if (!isNotify) return this.request('nvim_call_atomic', [list], (err, res) => {
          if (err) return reject(new Error(`call_atomic error: ${err[1]}`))
          resolve(res)
        })
        this.notify('nvim_call_atomic', [list])
        resolve()
      })
    }
    return isNotify ? null : Promise.resolve()
  }

  public abstract attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream, client: NeovimClient): void

  public abstract detach(): void

  public abstract request(method: string, args: any[], cb: Function): any

  public abstract notify(method: string, args: any[]): void

  protected abstract createResponse(requestId: number): Response

}
