import Connection from './connection'
import { NeovimClient } from '../api'
import { createLogger } from '../utils/logger'
const logger = createLogger('request')
const debug = process.env.NODE_CLIENT_LOG_LEVEL == 'debug'

export default class Request {
  private method: string
  private args: any[]
  constructor(
    private connection: Connection,
    private cb: Function,
    private readonly id: number
  ) {
  }

  public request(method: string, args: any[] = []): void {
    this.method = method
    this.args = args
    let m = process.env.COC_NVIM == '1' ? 'coc#api#call' : 'nvim#api#call'
    this.connection.call(m, [method.slice(5), args], this.id)
  }

  public callback(client: NeovimClient, err: any, result: any): void {
    let { method, cb } = this
    if (debug && err) {
      logger.debug(`request ${this.method} error:`, err, this.args)
    }
    if (err) return cb([0, err.toString()])
    switch (method) {
      case 'nvim_list_wins':
      case 'nvim_tabpage_list_wins':
        return cb(null, result.map(o => client.createWindow(o)))
      case 'nvim_tabpage_get_win':
      case 'nvim_get_current_win':
      case 'nvim_open_win':
        return cb(null, client.createWindow(result))
      case 'nvim_list_bufs':
        return cb(null, result.map(o => client.createBuffer(o)))
      case 'nvim_create_buf':
      case 'nvim_get_current_buf':
        return cb(null, client.createBuffer(result))
      case 'nvim_list_tabpages':
        return cb(null, result.map(o => client.createTabpage(o)))
      case 'nvim_get_current_tabpage':
        return cb(null, client.createTabpage(result))
      default:
        return cb(null, result)
    }
  }
}
