import { EventEmitter } from 'events'
import { createLogger } from '../utils/logger'
import { NeovimClient } from '../api'
import { Logger } from '../types';
const debug = process.env.NODE_CLIENT_LOG_LEVEL == 'debug'
const logger = createLogger('transport')

export interface Response {
  send: (resp: any, isError?: boolean) => void
}

export default abstract class Transport extends EventEmitter {
  public pauseLevel = 0
  protected paused: Map<number, [string, any[]][]> = new Map()

  constructor(protected logger: Logger) {
    super()
  }

  protected debug(key: string, ...meta: any[]): void {
    if (!debug) return
    logger.debug(key, ...meta)
  }

  protected info(key: string, ...meta: any[]): void {
    logger.info(key, ...meta)
  }

  protected debugMessage(msg: any[]): void {
    if (!debug) return
    const msgType = msg[0]
    if (msgType == 0) {
      logger.debug('receive request:', msg.slice(1))
    } else if (msgType == 1) {
      // logger.debug('receive response:', msg.slice(1))
    } else if (msgType == 2) {
      logger.debug('receive notification:', msg.slice(1))
    } else {
      logger.debug('unknown message:', msg)
    }
  }

  public pauseNotification(): void {
    this.pauseLevel = this.pauseLevel + 1
    this.paused.set(this.pauseLevel, [])
  }

  public cancelNotification(): void {
    let { pauseLevel } = this
    if (pauseLevel > 0) {
      this.paused.delete(pauseLevel)
      this.pauseLevel = pauseLevel - 1
    }
  }

  public resumeNotification(): Promise<void>
  public resumeNotification(isNotify: true): null
  public resumeNotification(isNotify = false): Promise<any> | null {
    let { pauseLevel } = this
    if (pauseLevel == 0) return isNotify ? null : Promise.resolve([null, null])
    let stack = Error().stack
    this.pauseLevel = pauseLevel - 1
    let list = this.paused.get(pauseLevel)
    this.paused.delete(pauseLevel)
    if (list && list.length) {
      return new Promise<void>((resolve, reject) => {
        if (!isNotify) {
          return this.request('nvim_call_atomic', [list], (err, res) => {
            if (err) {
              let e = new Error(`call_atomic error: ${err[1]}`)
              e.stack = stack
              return reject(e)
            }
            if (Array.isArray(res) && res[1] != null) {
              let [index, errType, message] = res[1]
              let [fname, args] = list[index]
              this.logger.error(`request error ${errType} on "${fname}"`, args, message, stack)
            }
            resolve(res)
          })
        }
        this.notify('nvim_call_atomic', [list])
        resolve()
      })
    }
    return isNotify ? null : Promise.resolve([[], undefined])
  }

  public abstract attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream, client: NeovimClient): void

  public abstract detach(): void

  public abstract send(arr: any[]): void

  public abstract request(method: string, args: any[], cb: Function): any

  public abstract notify(method: string, args: any[]): void

  protected abstract createResponse(requestId: number): Response
}
