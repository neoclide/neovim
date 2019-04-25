import Transport, { Response } from './base'
import Connection from './connection'
import { NeovimClient } from '../api'
import Request from './request'

export class VimTransport extends Transport {
  private pending: Map<number, Request> = new Map()
  private nextRequestId = 0
  private connection: Connection
  private attached = false
  private client: NeovimClient

  constructor() {
    super()
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
    if (!this.client.hasFunction(method)) {
      // tslint:disable-next-line: no-console
      console.error(`method: ${method} not supported.`)
    }
    this.nextRequestId = this.nextRequestId - 1
    let req = new Request(this.connection, cb, this.nextRequestId)
    this.pending.set(this.nextRequestId, req)
    req.request(method, args)
  }

  public notify(method: string, args: any[]): void {
    if (!this.attached) return
    if (!this.client.hasFunction(method)) {
      // tslint:disable-next-line: no-console
      console.error(`method: ${method} not supported.`)
    }
    if (this._paused) {
      this.paused.push([method, args])
      return
    }
    let m = process.env.COC_NVIM == '1' ? 'coc#api#notify' : 'nvim#api#notify'
    this.connection.call(m, [method.slice(5), args])
  }

  protected createResponse(requestId: number): Response {
    let called = false
    let { connection } = this
    return {
      send: (resp: any, isError?: boolean): void => {
        if (called || !this.attached) return
        called = true
        let err: string = null
        if (isError) err = typeof resp === 'string' ? resp : resp.toString()
        connection.response(requestId, [err, isError ? null : resp])
      }
    }
  }
}
