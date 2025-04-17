process.env.VIM_NODE_RPC = '1'
const net = require('net')
const os = require('os')
const path = require('path')

/**
 * Connect to vim remote address
 */
const attach = require('../').attach

module.exports = (async function () {
  const address = process.env.NVIM_REMOTE_ADDRESS ?? path.join(os.tmpdir(), `coc-test-${uid(8)}.sock`)
  console.log(`To connect, use command: NVIM_REMOTE_ADDRESS=${address} vim -c 'source start.vim'`)
  let promise = new Promise(resolve => {
    let server = net.createServer(socket => {
      let nvim = attach({reader: socket, writer: socket}, undefined, false)
      nvim.on('vim_error', err => {
        console.error('Error from vim: ', err)
      })
      resolve(nvim)
    })
    server.on('error', e => {
      console.error(e)
    })
    server.listen(address)
  })
  return await promise
})()

function uid(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}
