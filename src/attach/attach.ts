import { createConnection } from 'net'
import * as child from 'child_process'
import { NeovimClient } from './../api/client'
import { createLogger, ILogger } from '../utils/logger'

export interface Attach {
  reader?: NodeJS.ReadableStream
  writer?: NodeJS.WritableStream
  proc?: NodeJS.Process | child.ChildProcess
  socket?: string
}

export function attach({
  reader: _reader,
  writer: _writer,
  proc,
  socket,
}: Attach, logger?: ILogger): NeovimClient {
  let writer: NodeJS.WritableStream
  let reader: NodeJS.ReadableStream
  let neovim: NeovimClient
  logger = logger || createLogger('node-client')

  if (socket) {
    const client = createConnection(socket)
    writer = client
    reader = client
    client.once('close', () => {
      neovim.detach()
    })
  } else if (_reader && _writer) {
    writer = _writer
    reader = _reader
  } else if (proc) {
    writer = proc.stdin
    reader = proc.stdout
    proc.once('disconnect', () => {
      neovim.detach()
    })
  }
  writer.on('error', err => {
    if (err.code == 'EPIPE') {
      neovim.detach()
    }
  })

  if (writer && reader) {
    neovim = new NeovimClient({ logger })
    neovim.attach({
      writer,
      reader,
    })
    return neovim
  }
  throw new Error('Invalid arguments, could not attach')
}
