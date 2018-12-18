/**
 * Handles attaching transport
 */
import { Transport } from '../utils/transport'
import { VimValue } from '../types/VimValue'
import { Neovim } from './Neovim'
import { Buffer } from './Buffer'
import { createLogger, ILogger } from '../utils/logger'

export const DETACH_BUFFER = Symbol('detachBuffer')
export const ATTACH_BUFFER = Symbol('attachBuffer')

export type Callback = (err?: Error | null, res?: any) => void

export class AsyncResponse {
  constructor(public readonly requestId: number, private cb: Callback) {
  }

  finish(err?: string | null, res?: any): void {
    if (err) {
      this.cb(new Error(err))
      return
    }
    this.cb(null, res)
  }
}

export class NeovimClient extends Neovim {
  protected requestQueue: Array<any>
  private requestId = 1
  private transportAttached: boolean
  private responses: Map<number, AsyncResponse> = new Map()
  private _channelId: number
  private attachedBuffers: Map<number, Map<string, Function[]>> = new Map()
  private functions: string[]

  constructor(options: { transport?: Transport; logger?: ILogger } = {}) {
    // Neovim has no `data` or `metadata`
    super({
      logger: options.logger || createLogger('plugin'),
    })
    Object.defineProperty(this, 'client', {
      value: this
    })
    const transport = options.transport || new Transport()
    this.setTransport(transport)
    this.requestQueue = []
    this.transportAttached = false
    this.handleRequest = this.handleRequest.bind(this)
    this.handleNotification = this.handleNotification.bind(this)
  }

  createBuffer(id: number): Buffer {
    return new Buffer({
      transport: this.transport,
      data: id,
      client: this
    })
  }

  /** Attaches msgpack to read/write streams * */
  attach({
    reader,
    writer,
  }: {
    reader: NodeJS.ReadableStream
    writer: NodeJS.WritableStream
  }) {
    this.transport.attach(writer, reader, this)
    this.transportAttached = true
    this.setupTransport()
  }

  get isApiReady(): boolean {
    return this.transportAttached && typeof this._channelId !== 'undefined'
  }

  get channelId(): Promise<number> {
    return new Promise(async resolve => {
      await this._isReady
      resolve(this._channelId)
    })
  }

  public isAttached(bufnr: number): boolean {
    return this.attachedBuffers.has(bufnr)
  }

  handleRequest(
    method: string,
    args: VimValue[],
    resp: any,
    ...restArgs: any[]
  ) {
    this.logger.debug(`handleRequest: ${method}`)
    // If neovim API is not generated yet and we are not handle a 'specs' request
    // then queue up requests
    //
    // Otherwise emit as normal
    if (!this.isApiReady && method !== 'specs') {
      this.requestQueue.push({
        type: 'request',
        args: [method, args, resp, ...restArgs],
      })
    } else {
      this.emit('request', method, args, resp)
    }
  }

  sendAsyncRequest(method: string, args: any[]): Promise<any> {
    let id = this.requestId
    this.requestId = id + 1
    this.notify('nvim_call_function', ['coc#rpc#async_request', [id, method, args || []]])
    return new Promise<any>((resolve, reject) => {
      let response = new AsyncResponse(id, (err?: Error, res?: any): void => {
        if (err) return reject(err)
        resolve(res)
      })
      this.responses.set(id, response)
    })
  }

  emitNotification(method: string, args: any[]) {
    if (method.endsWith('_event')) {
      if (method.startsWith('nvim_buf_')) {
        const shortName = method.replace(/nvim_buf_(.*)_event/, '$1')
        const buffer = args[0] as Buffer
        const { id } = buffer

        if (!this.isAttached(id)) {
          // this is a problem
          return
        }

        const bufferMap = this.attachedBuffers.get(id)
        const cbs = bufferMap.get(shortName) || []
        cbs.forEach(cb => cb(...args))

        // Handle `nvim_buf_detach_event`
        // clean `attachedBuffers` since it will no longer be attached
        if (shortName === 'detach') {
          this.attachedBuffers.delete(id)
        }
        return
      }
      // nvim_async_request_event
      if (method.startsWith('nvim_async_request')) {
        const [id, method, arr] = args
        this.handleRequest(method, arr, {
          send: (resp: any, isError?: boolean): void => {
            this.notify('nvim_call_function', ['coc#rpc#async_response', [id, resp, isError]])
          }
        })
      }
      // nvim_async_response_event
      if (method.startsWith('nvim_async_response')) {
        const [id, err, res] = args
        const response = this.responses.get(id)
        if (!response) {
          this.logger.error(`Response not found for request ${id}`)
          return
        }
        this.responses.delete(id)
        response.finish(err, res)
        return
      }
      this.logger.error(`Unhandled event: ${method}`)
    } else {
      this.emit('notification', method, args)
    }
  }

  handleNotification(method: string, args: VimValue[], ...restArgs: any[]) {
    this.logger.info(`handleNotification: ${method}`)
    // If neovim API is not generated yet then queue up requests
    //
    // Otherwise emit as normal
    if (!this.isApiReady) {
      this.requestQueue.push({
        type: 'notification',
        args: [method, args, ...restArgs],
      })
    } else {
      this.emitNotification(method, args)
    }
  }

  // Listen and setup handlers for transport
  setupTransport() {
    if (!this.transportAttached) {
      throw new Error('Not attached to input/output')
    }

    this.transport.on('request', this.handleRequest)
    this.transport.on('notification', this.handleNotification)
    this.transport.on('detach', () => {
      this.emit('disconnect')
      this.transport.removeAllListeners('request')
      this.transport.removeAllListeners('notification')
      this.transport.removeAllListeners('detach')
    })

    this._isReady = this.generateApi()
  }

  requestApi(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.transport.request(
        'nvim_get_api_info',
        [],
        (err: Error, res: any[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        }
      )
    })
  }

  async generateApi(): Promise<null | boolean> {
    let results

    try {
      results = await this.requestApi()
    } catch (err) {
      this.logger.error('Could not get vim api results')
      this.logger.error(err)
    }

    if (results) {
      try {
        const [channelId, metadata] = results
        this.functions = metadata.functions.map(f => f.name)
        this._channelId = channelId

        // register the non-queueing handlers
        // dequeue any pending RPCs
        this.requestQueue.forEach(pending => {
          if (pending.type === 'notification') {
            this.emitNotification(pending.args[0], pending.args[1])
          } else {
            this.emit(pending.type, ...pending.args)
          }
        })
        this.requestQueue = []

        return true
      } catch (err) {
        this.logger.error(`Could not dynamically generate neovim API: ${err.message}`)
        this.logger.error(err.stack)
        return null
      }
    }

    return null
  }

  [ATTACH_BUFFER](buffer: Buffer): void {
    this.attachedBuffers.set(buffer.id, new Map())
  }

  [DETACH_BUFFER](buffer: Buffer): void {
    this.attachedBuffers.delete(buffer.id)
  }

  attachBufferEvent(buffer: Buffer, eventName: string, cb: Function) {

    if (!this.isAttached(buffer.id)) {
      console.error(`${buffer.id} is detached`)
      return null
    }

    const bufferMap = this.attachedBuffers.get(buffer.id)
    if (!bufferMap.get(eventName)) {
      bufferMap.set(eventName, [])
    }

    const cbs = bufferMap.get(eventName)
    if (cbs.indexOf(cb) !== -1) return cb
    cbs.push(cb)
    bufferMap.set(eventName, cbs)
    this.attachedBuffers.set(buffer.id, bufferMap)
    return cb
  }

  /**
   * Returns `true` if buffer should be detached
   */
  detachBufferEvent(buffer: Buffer, eventName: string, cb: Function) {
    const bufferMap = this.attachedBuffers.get(buffer.id)
    if (!bufferMap) return

    const handlers = (bufferMap.get(eventName) || []).filter(
      handler => handler !== cb
    )

    // Remove eventName listener from bufferMap if no more handlers
    if (!handlers.length) {
      bufferMap.delete(eventName)
    } else {
      bufferMap.set(eventName, handlers)
    }
  }

  pauseNotification(): void {
    if (this.hasFunction('nvim_call_atomic')) {
      this.transport.pauseNotification()
    }
  }

  resumeNotification(cancel = false) {
    if (this.hasFunction('nvim_call_atomic')) {
      this.transport.resumeNotification(cancel)
    }
  }

  hasFunction(name: string): boolean {
    return this.functions.indexOf(name) !== -1
  }
}
