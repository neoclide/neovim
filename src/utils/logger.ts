import * as util from 'util'
const debug = util.debuglog('nvim-logger')

export interface ILogger {
  debug: (data: string, ...meta: any[]) => void
  info: (data: string, ...meta: any[]) => void
  error: (data: string, ...meta: any[]) => void
  trace: (data: string, ...meta: any[]) => void
}

export function createLogger(name: string): ILogger {
  return {
    debug: (data: string, ..._meta: any[]): void => {
      debug(`[debug ${name}] - ${data}`)
    },
    info: (data: string, ..._meta: any[]): void => {
      debug(`[info ${name}] - ${data}`)
    },
    error: (data: string, ..._meta: any[]): void => {
      debug(`[error ${name}] - ${data}`)
    },
    trace: (data: string, ..._meta: any[]): void => {
      debug(`[trace ${name}] - ${data}`)
    }
  }
}
