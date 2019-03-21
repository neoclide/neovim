/**
 * Some code borrowed from https://github.com/tarruda/node-msgpack5rpc
 */

import { EventEmitter } from 'events'

import * as msgpack from 'msgpack-lite'

import Buffered from './buffered'
import { Metadata } from '../api/types'
import { ILogger } from './logger'

interface Response {
  send: (resp: any, isError?: boolean) => void
}

const debug = process.env.NVIM_NODE_CLIENT == 'debug'

class Transport extends EventEmitter {
  private pending: Map<number, Function> = new Map()
  private nextRequestId = 1
  private encodeStream: any
  private decodeStream: any
  private reader: NodeJS.ReadableStream
  private writer: NodeJS.WritableStream
  protected codec: msgpack.Codec
  private attached = false
  private paused: [string, any[]][] = []
  private _paused = false
  private logger: ILogger

  // Neovim client that holds state
  private client: any

  constructor() {
    super()

    const codec = this.setupCodec()
    this.encodeStream = msgpack.createEncodeStream({ codec })
    this.decodeStream = msgpack.createDecodeStream({ codec })
    this.decodeStream.on('data', (msg: any[]) => {
      this.parseMessage(msg)
    })
    this.decodeStream.on('end', () => {
      this.detach()
      this.emit('detach')
    })
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

  private setupCodec(): msgpack.Codec {
    const codec = msgpack.createCodec()

    Metadata.forEach(
      ({ constructor }, id: number): void => {
        codec.addExtPacker(id, constructor, (obj: any) =>
          msgpack.encode(obj.data)
        )
        codec.addExtUnpacker(
          id,
          data =>
            new constructor({
              transport: this,
              client: this.client,
              data: msgpack.decode(data),
            })
        )
      }
    )

    this.codec = codec
    return this.codec
  }

  public attach(
    writer: NodeJS.WritableStream,
    reader: NodeJS.ReadableStream,
    client: any
  ): void {
    this.encodeStream = this.encodeStream.pipe(writer)
    const buffered = new Buffered()
    reader.pipe(buffered).pipe(this.decodeStream)
    this.writer = writer
    this.reader = reader
    this.client = client
    this.logger = client.logger
    this.attached = true
  }

  public detach(): void {
    if (!this.attached) return
    this.attached = false
    this.encodeStream.unpipe(this.writer)
    this.reader.unpipe(this.decodeStream)
  }

  public request(method: string, args: any[], cb: Function): any {
    if (!this.attached) return cb([0, 'transport disconnected'])
    this.nextRequestId = this.nextRequestId + 1
    this.debug('send request:', this.nextRequestId, method, args)
    this.encodeStream.write(
      msgpack.encode([0, this.nextRequestId, method, args], {
        codec: this.codec,
      })
    )
    this.pending.set(this.nextRequestId, cb)
  }

  public notify(method: string, args: any[]): void {
    if (!this.attached) return
    if (this._paused) {
      this.paused.push([method, args])
      return
    }
    this.debug('send notification:', method, args)
    this.encodeStream.write(
      msgpack.encode([2, method, args], {
        codec: this.codec,
      })
    )
  }

  private debug(key: string, ...meta: any[]): void {
    if (!debug) return
    this.logger.debug(key, meta)
  }

  private debugMessage(msg: any[]): void {
    if (!debug) return
    const msgType = msg[0]
    if (msgType == 0) {
      this.logger.debug('receive request:', msg.slice(1))
    } else if (msgType == 1) {
      this.logger.debug('receive response:', msg.slice(1))
    } else if (msgType == 2) {
      this.logger.debug('receive notification:', msg.slice(1))
    } else {
      this.logger.debug('unknown message:', msg)
    }
  }

  private parseMessage(msg: any[]): void {
    const msgType = msg[0]
    this.debugMessage(msg)

    if (msgType === 0) {
      // request
      //   - msg[1]: id
      //   - msg[2]: method name
      //   - msg[3]: arguments
      this.emit(
        'request',
        msg[2].toString(),
        msg[3],
        this.createResponse(msg[1])
      )
    } else if (msgType === 1) {
      // response to a previous request:
      //   - msg[1]: the id
      //   - msg[2]: error(if any)
      //   - msg[3]: result(if not errored)
      const id = msg[1]
      const handler = this.pending.get(id)
      if (handler) {
        this.pending.delete(id)
        let err = msg[2]
        if (err && err.length != 2) {
          err = [0, err instanceof Error ? err.message : err]
        }
        handler(err, msg[3])
      }
    } else if (msgType === 2) {
      // notification/event
      //   - msg[1]: event name
      //   - msg[2]: arguments
      this.emit('notification', msg[1].toString(), msg[2])
    } else {
      // tslint:disable-next-line: no-console
      console.error(`Invalid message type ${msgType}`)
    }
  }

  private createResponse(requestId: number): Response {
    let called = false
    let { encodeStream } = this
    return {
      send: (resp: any, isError?: boolean): void => {
        if (called || !this.attached) return
        called = true
        encodeStream.write(
          msgpack.encode([
            1,
            requestId,
            isError ? resp : null,
            !isError ? resp : null,
          ])
        )
      }
    }
  }
}

export { Transport }
