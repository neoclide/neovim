/**
 * Handles attaching transport
 */
import { NvimTransport } from '../transport/nvim'
import { VimTransport } from '../transport/vim'
import { VimValue } from '../types/VimValue'
import { Neovim } from './Neovim'
import { Buffer } from './Buffer'
import { Window } from './Window'
import { Tabpage } from './Tabpage'
import { createLogger } from '../utils/logger'

export const DETACH_BUFFER = Symbol('detachBuffer')
export const ATTACH_BUFFER = Symbol('attachBuffer')
const logger = createLogger('client')
const isVim = process.env.VIM_NODE_RPC == '1'

export type Callback = (err?: Error | null, res?: any) => void

export class AsyncResponse {
  private finished = false
  constructor(public readonly requestId: number, private cb: Callback) {
  }

  public finish(err?: string | null, res?: any): void {
    if (this.finished) return
    this.finished = true
    if (err) {
      this.cb(new Error(err))
      return
    }
    this.cb(null, res)
  }
}

export class NeovimClient extends Neovim {
  private _isReady: Promise<boolean>
  private requestId = 1
  private transportAttached: boolean
  private responses: Map<number, AsyncResponse> = new Map()
  private _channelId: number
  private attachedBuffers: Map<number, Map<string, Function[]>> = new Map()
  private functions: string[]
  private timers: Map<number, NodeJS.Timer> = new Map()

  constructor() {
    // Neovim has no `data` or `metadata`
    super({})
    Object.defineProperty(this, 'client', {
      value: this
    })
    let transport = isVim ? new VimTransport() : new NvimTransport()
    this.setTransport(transport)
    this.transportAttached = false
    this.handleRequest = this.handleRequest.bind(this)
    this.handleNotification = this.handleNotification.bind(this)
  }

  public createBuffer(id: number): Buffer {
    return new Buffer({
      transport: this.transport,
      data: id,
      client: this
    })
  }

  public createWindow(id: number): Window {
    return new Window({
      transport: this.transport,
      data: id,
      client: this
    })
  }

  public createTabpage(id: number): Tabpage {
    return new Tabpage({
      transport: this.transport,
      data: id,
      client: this
    })
  }

  /** Attaches msgpack to read/write streams * */
  public attach({
    reader,
    writer,
  }: {
    reader: NodeJS.ReadableStream
    writer: NodeJS.WritableStream
  }, requestApi = true): void {
    this.transport.attach(writer, reader, this)
    this.transportAttached = true
    this.setupTransport(requestApi)
  }

  /* called when attach process disconnected*/
  public detach(): void {
    for (let timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.transport.detach()
    this.transportAttached = false
  }

  public get isApiReady(): boolean {
    return this.transportAttached && typeof this._channelId !== 'undefined'
  }

  public get channelId(): Promise<number> {
    return this._isReady.then(() => {
      return this._channelId
    })
  }

  public isAttached(bufnr: number): boolean {
    return this.attachedBuffers.has(bufnr)
  }

  private handleRequest(
    method: string,
    args: VimValue[],
    resp: any,
  ): void {
    this.emit('request', method, args, resp)
  }

  public sendAsyncRequest(method: string, args: any[]): Promise<any> {
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

  private emitNotification(method: string, args: any[]): void {
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
      // async_request_event from vim
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
          // tslint:disable-next-line: no-console
          console.error(`Response not found for request ${id}`)
          return
        }
        this.responses.delete(id)
        response.finish(err, res)
        return
      }
      // tslint:disable-next-line: no-console
      // console.error(`Unhandled event: ${method}`)
    } else {
      this.emit('notification', method, args)
    }
  }

  private handleNotification(method: string, args: VimValue[]): void {
    this.emitNotification(method, args)
  }

  // Listen and setup handlers for transport
  private setupTransport(requestApi = true): void {
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
    if (requestApi) {
      this._isReady = this.generateApi()
    } else {
      this._channelId = 0
      this._isReady = Promise.resolve(true)
    }
  }

  public requestApi(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.transport.request(
        'nvim_get_api_info',
        [],
        (err: any, res: any[]) => {
          if (err) {
            reject(new Error(Array.isArray(err) ? err[1] : err.message || err.toString()))
          } else {
            resolve(res)
          }
        }
      )
    })
  }

  private async generateApi(): Promise<null | boolean> {
    let results

    try {
      results = await this.requestApi()
    } catch (err) {
      // tslint:disable-next-line: no-console
      console.error('Could not get vim api results')
      logger.error(err)
    }

    if (results) {
      try {
        const [channelId, metadata] = results
        this.functions = metadata.functions.map(f => f.name)
        this._channelId = channelId
        return true
      } catch (err) {
        logger.error(err.stack)
        return null
      }
    }

    return null
  }

  public [ATTACH_BUFFER](buffer: Buffer): void {
    this.attachedBuffers.set(buffer.id, new Map())
  }

  public [DETACH_BUFFER](buffer: Buffer): void {
    this.attachedBuffers.delete(buffer.id)
  }

  public attachBufferEvent(buffer: Buffer, eventName: string, cb: Function): void {
    if (!this.isAttached(buffer.id)) return
    const bufferMap = this.attachedBuffers.get(buffer.id)
    if (!bufferMap.get(eventName)) {
      bufferMap.set(eventName, [])
    }

    const cbs = bufferMap.get(eventName)
    if (cbs.indexOf(cb) !== -1) return
    cbs.push(cb)
    bufferMap.set(eventName, cbs)
    this.attachedBuffers.set(buffer.id, bufferMap)
    return
  }

  /**
   * Returns `true` if buffer should be detached
   */
  public detachBufferEvent(buffer: Buffer, eventName: string, cb: Function): void {
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

  public pauseNotification(): void {
    this.transport.pauseNotification()
    let pauseLevel = this.transport.pauseLevel
    let stack = Error().stack
    let timer = setTimeout(() => {
      if (this.transport.pauseLevel >= pauseLevel) {
        this.transport.cancelNotification()
        logger.error(`pauseNotification not finished after 1s`, stack)
      }
    }, 2000)
    this.timers.set(pauseLevel, timer)
  }

  public resumeNotification(cancel?: boolean, notify?: boolean): Promise<any> {
    let { pauseLevel } = this.transport
    let timer = this.timers.get(pauseLevel)
    if (timer) {
      this.timers.delete(pauseLevel)
      clearTimeout(timer)
    }
    if (cancel) return Promise.resolve(this.transport.cancelNotification())
    if (notify) {
      return Promise.resolve(this.transport.resumeNotification(true))
    }
    return Promise.resolve(this.transport.resumeNotification())
  }

  public hasFunction(name: string): boolean {
    if (!this.functions) return true
    return this.functions.indexOf(name) !== -1
  }
}
