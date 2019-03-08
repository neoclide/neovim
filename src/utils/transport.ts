/**
 * Some code borrowed from https://github.com/tarruda/node-msgpack5rpc
 */

import { EventEmitter } from 'events'

import * as msgpack from 'msgpack-lite'

import Buffered from './buffered'
import { Metadata } from '../api/types'

export type Check = () => boolean

class Response {
  private requestId: number
  private sent: boolean
  private encoder: NodeJS.WritableStream

  constructor(encoder: NodeJS.WritableStream, requestId: number, private check: Check) {
    this.encoder = encoder
    this.requestId = requestId
  }

  public send(resp: any, isError?: boolean): void {
    if (this.sent) {
      throw new Error(`Response to id ${this.requestId} already sent`)
    }
    if (!this.check()) return
    this.encoder.write(
      msgpack.encode([
        1,
        this.requestId,
        isError ? resp : null,
        !isError ? resp : null,
      ])
    )
    this.sent = true
  }
}

class Transport extends EventEmitter {
  private pending: Map<number, Function> = new Map()
  private nextRequestId = 1
  private encodeStream: any
  private decodeStream: any
  private reader: NodeJS.ReadableStream
  private writer: NodeJS.WritableStream
  protected codec: msgpack.Codec
  private attached = true
  private paused: [string, any[]][] = []
  private _paused = false

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
        if (!isNotify) return this.request('nvim_call_atomic', [list], err => {
          if (err) return reject(err)
          resolve()
        })
        this.notify('nvim_call_atomic', [list])
        resolve()
      })
    }
    return Promise.resolve()
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
  }

  public detach(): void {
    if (!this.attached) return
    this.attached = false
    this.encodeStream.unpipe(this.writer)
    this.reader.unpipe(this.decodeStream)
  }

  public request(method: string, args: any[], cb: Function): any {
    if (!this.attached) return cb()
    this.nextRequestId = this.nextRequestId + 1
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
    this.encodeStream.write(
      msgpack.encode([2, method, args], {
        codec: this.codec,
      })
    )
  }

  private parseMessage(msg: any[]): void {
    const msgType = msg[0]

    if (msgType === 0) {
      // request
      //   - msg[1]: id
      //   - msg[2]: method name
      //   - msg[3]: arguments
      this.emit(
        'request',
        msg[2].toString(),
        msg[3],
        new Response(this.encodeStream, msg[1], () => this.attached)
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
        handler(msg[2], msg[3])
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
}

export { Transport }
