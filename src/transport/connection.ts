import Emitter from 'events'
import readline from 'readline'
import { createLogger } from '../utils/logger'
const logger = createLogger('connection')

// vim connection by using channel feature
export default class Connection extends Emitter {
  constructor(
    private readable: NodeJS.ReadableStream,
    private writeable: NodeJS.WritableStream) {
    super()
    const rl = readline.createInterface(this.readable)
    rl.on('line', (line: string) => {
      this.parseData(line)
    })
    rl.on('close', () => {
      logger.error('connection closed')
      process.exit(0)
    })
  }

  private parseData(str: string): void {
    if (str.length == 0) return
    let arr: any[]
    try {
      arr = JSON.parse(str)
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.error(`Invalid data from vim: ${str}`)
      return
    }
    // request, notification, response
    let [id, obj] = arr
    if (id > 0) {
      logger.debug('received request:', id, obj)
      this.emit('request', id, obj)
    } else if (id == 0) {
      logger.debug('received notification:', obj)
      this.emit('notification', obj)
    } else {
      logger.debug('received response:', id, obj)
      // response for previous request
      this.emit('response', id, obj)
    }
  }

  public response(requestId: number, data?: any): void {
    this.send([requestId, data || null])
  }

  public notify(event: string, data?: any): void {
    this.send([0, [event, data || null]])
  }

  public send(arr: any[]): void {
    logger.debug('send to vim:', arr)
    try {
      this.writeable.write(JSON.stringify(arr) + '\n')
    } catch (e) {
      logger.error('Send error:', arr)
    }
  }

  public redraw(force?: boolean): void {
    this.send(['redraw', force ? 'force' : ''])
  }

  public command(cmd: string): void {
    this.send(['ex', cmd])
  }

  public expr(expr: string): void {
    this.send(['expr', expr])
  }

  public call(func: string, args: any[], requestId?: number): void {
    if (!requestId) {
      this.send(['call', func, args])
      return
    }
    this.send(['call', func, args, requestId])
  }

  public dispose(): void {
    this.removeAllListeners()
  }
}
