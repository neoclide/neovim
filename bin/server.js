// test rpc on vim
const {attach} = require('../lib/attach')
const {createLogger} = require('../lib/utils/logger')
const logger = createLogger('server')

let nvim = attach({
  reader: process.stdin,
  writer: process.stdout
}, undefined, false)

nvim.on('notification', async (method, args) => {
  logger.debug('notification => ', method, args)
})

async function onRequest(method, args, resp) {
  logger.debug('request => ', method, args)
  if (method == 'error') {
    return resp.send(new Error('custom error'), true)
  }
  if (method == 'ex') {
    nvim.exVim(args[0])
    return resp.send(1)
  }
  if (method == 'call') {
    let res = await nvim.callVim(args[0], args[1])
    logger.info('call result', res)
    if (typeof res === 'string') {
      logger.info('result length', res.length)
    }
    return resp.send(1)
  }
  if (method == 'eval') {
    let res = await nvim.evalVim(args[0])
    logger.info('eval result', res, res.length)
    return resp.send(1)
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
}

nvim.on('request', async (method, args, resp) => {
  try {
    await onRequest(method, args, resp)
  } catch (e) {
    logger.error(`Error on request "${method}"`, e.message)
    resp.send(1)
  }
})

nvim.channelId.then(async channelId => {
  logger.debug('channelId => ', channelId)
})
