import Transport, { Response } from './base'
import Connection from './connection'
import { NeovimClient } from '../api'
import Request from './request'

export class VimTransport extends Transport {
  private pending: Map<number, Request> = new Map()
  private nextRequestId = -1
  private connection: Connection
  private attached = false
  private client: NeovimClient
  private notifyMethod: string

  constructor() {
    super()
    this.notifyMethod = process.env.COC_NVIM == '1' ? 'coc#api#notify' : 'nvim#api#notify'
  }

  public attach(
    writer: NodeJS.WritableStream,
    reader: NodeJS.ReadableStream,
    client: NeovimClient
  ): void {
    let connection = this.connection = new Connection(reader, writer)
    this.attached = true
    this.client = client

    connection.on('request', (id: number, obj: any) => {
      let [method, args] = obj
      this.emit(
        'request',
        method,
        args,
        this.createResponse(id)
      )
    })
    connection.on('notification', (obj: any) => {
      let [event, args] = obj
      this.emit('notification', event.toString(), args)
    })
    connection.on('response', (id: number, obj: any) => {
      let req = this.pending.get(id)
      if (req) {
        this.pending.delete(id)
        let err = null
        let result = null
        if (!Array.isArray(obj)) {
          err = obj
        } else {
          err = obj[0]
          result = obj[1]
        }
        req.callback(this.client, err, result)
      }
    })
  }

  public detach(): void {
    if (!this.attached) return
    this.attached = false
    this.connection.dispose()
  }

  /**
   * Send request to vim
   */
  public request(method: string, args: any[], cb: Function): any {
    if (!this.attached) return cb([0, 'transport disconnected'])
    let id = this.nextRequestId
    this.nextRequestId = this.nextRequestId - 1
    let startTs = Date.now()
    this.debug('request to vim:', id, method, args)
    let timer = setTimeout(() => {
      this.debug(`request to vim cost more than 1s`, method, args)
    }, 1000)
    let req = new Request(this.connection, (err, res) => {
      clearTimeout(timer)
      this.debug('response of vim:', id, `${Date.now() - startTs}ms`, res, err)
      cb(err, res)
    }, id)
    this.pending.set(id, req)
    req.request(method, args)
  }

  public notify(method: string, args: any[]): void {
    if (!this.attached) return
    if (this.pauseLevel != 0) {
      let arr = this.paused.get(this.pauseLevel)
      if (arr) {
        arr.push([method, args])
        return
      }
    }
    this.connection.call(this.notifyMethod, [method.slice(5), args])
  }

  protected createResponse(requestId: number): Response {
    let called = false
    let { connection } = this
    let startTs = Date.now()
    let timer = setTimeout(() => {
      this.debug(`request to client cost more than 1s`, requestId)
    }, 1000)
    return {
      send: (resp: any, isError?: boolean): void => {
        clearTimeout(timer)
        if (called || !this.attached) return
        called = true
        let err: string = null
        if (isError) err = typeof resp === 'string' ? resp : resp.toString()
        this.debug('response of client:', requestId, `${Date.now() - startTs}ms`, resp, isError == true)
        connection.response(requestId, [err, isError ? null : resp])
      }
    }
  }
}
