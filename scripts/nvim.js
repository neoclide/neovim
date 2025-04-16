/**
 * Spawns an embedded neovim instance and returns Neovim API
 */
const cp = require('child_process')
const attach = require('../').attach

module.exports = (function () {
  let proc
  let socket

  if (process.env.NVIM_LISTEN_ADDRESS) {
    socket = process.env.NVIM_LISTEN_ADDRESS
  } else {
    proc = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {
      cwd: __dirname,
    })
  }

  return attach({proc, socket}, undefined, false)
})()
