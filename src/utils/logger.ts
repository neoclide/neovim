import * as util from 'util'
const debug = util.debuglog('nvim-logger')

export interface ILogger {
  debug: (data: string) => void
  info: (data: string) => void
  error: (data: string) => void
  trace: (data: string) => void
}

export function createLogger(name: string): ILogger {
  return {
    debug: (data: string): void => {
      debug(`[debug ${name}] - ${data}`)
    },
    info: (data: string): void => {
      debug(`[info ${name}] - ${data}`)
    },
    error: (data: string): void => {
      debug(`[error ${name}] - ${data}`)
    },
    trace: (data: string): void => {
      debug(`[trace ${name}] - ${data}`)
    }
  }
}
