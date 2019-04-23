// test rpc on vim
const { attach } = require('../lib/attach')
const { createLogger } = require('../lib/utils/logger')
const logger = createLogger('server')

let nvim = attach({
  reader: process.stdin,
  writer: process.stdout
})

nvim.on('notification', async (method, args) => {
  logger.debug('notification => ', method, args)
})

nvim.on('request', async (method, args, resp) => {
  logger.debug('request => ', method, args)
  if (method == 'error') {
    return resp.send(new Error('custom error'), true)
  }
  try {
    await nvim.call('ErrorFunc')
  } catch (e) {
    logger.error(e)
  }
  // let buffer = await nvim.buffer
  // await nvim.command('normal! gg')
  // nvim.command('normal! G', true)
  return resp.send(1)
})

nvim.channelId.then(async channelId => {
  logger.debug('channelId => ', channelId)
})
