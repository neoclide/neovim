import * as cp from 'child_process'
import net, { Server } from 'net'
import os from 'os'
import path from 'path'
import { Neovim } from '../api'
import { attach } from '../attach/attach'
import { createLogger } from '../utils/logger'
const vimrc = path.resolve(__dirname, 'vimrc')

let proc: cp.ChildProcess
let nvim: Neovim
let server: Server

export async function setupVim(): Promise<Neovim> {
  const address = path.join(os.tmpdir(), `coc-test-${uid(8)}.sock`)
  let promise = new Promise<Neovim>(resolve => {
    server = net.createServer(socket => {
      const logger = createLogger('test')
      nvim = attach({ reader: socket, writer: socket }, logger, false)
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
  let executable = process.env.VIM_COMMAND ?? 'vim'
  proc = cp.spawn(executable, ['--clean', '--noplugin', '--not-a-term', '-u', vimrc], {
    stdio: 'pipe',
    shell: true,
    cwd: __dirname,
    env: {
      NVIM_REMOTE_ADDRESS: address,
      ...process.env
    }
  })
  proc.on('error', err => {
    console.error(err)
  })
  return await promise
}

function uid(length): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export async function shutdown(): Promise<void> {
  if (nvim) await nvim.quit()
  if (server) server.close()
  if (proc) proc.kill('SIGKILL')
}

export function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve(undefined)
  return new Promise(resolve => {
    let timer = setTimeout(() => {
      resolve(undefined)
    }, ms)
    timer.unref()
  })
}
