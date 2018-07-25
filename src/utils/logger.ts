import * as os from 'os'
import * as path from 'path'
import {Logger} from 'log4js'
const log4js = require('log4js')


const MAX_LOG_SIZE = 1024 * 1024
const MAX_LOG_BACKUPS = 10

const level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';
const LOG_FILE_PATH = process.env.NVIM_COC_LOG_FILE || path.join(os.tmpdir(), 'node-client.log')

log4js.configure({
  appenders: {
    out: {
      type: 'file',
      filename: LOG_FILE_PATH,
      maxLogSize: MAX_LOG_SIZE,
      backups: MAX_LOG_BACKUPS,
      layout: {
        type: 'pattern',
        // Format log in following pattern:
        // yyyy-MM-dd HH:mm:ss.mil $Level (pid:$pid) $categroy - $message.
        pattern: `%d{ISO8601} %p (pid:${process.pid}) [%c] - %m`,
      },
    }
  },
  categories: {
    default: {appenders: ['out'], level}
  }
})

module.exports = (name: string): Logger => {
  return log4js.getLogger(name)
}
