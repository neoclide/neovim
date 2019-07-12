# neovim-client

Fork of [neovim/node-client](https://github.com/neovim/node-client) which works
on both vim8 and neovim.

Currently works on node >= 8.

This module is used by [coc.nvim](https://github.com/neoclide/coc.nvim), you can
this module to create extension for vim8 and neovim, but it's recommended to
build extension for coc.nvim.

## Installation

Install the `neovim` package globally using `npm`.

```sh
npm install -g @chemzqm/neovim
```

## Build from source code

Git clone then run `yarn install`.

## API

```typescript
import {attach, NeovimClient} from '@chemzqm/neovim'
// attach option could be ReadableStream & WritableStream or ChildProcess or socket string
const nvim: NeovimClient = attach({
  reader: process.stdin,
  writer: process.stdout
})
// current buffer object
let buf = await nvim.buffer
// current window object
let win = await nvim.window
// current tabpage object
let tabpage = await nvim.tabpage
```

## Debug on vim8

Build this module from source code, in root of project folder,
start the server by command: `vim -u mini.vim`.

Checkout the vim8's log file by `:Openlog` command.

Checkout log of node-client by open the file `$XDG_RUNTIME_DIR/node-client.log`.

To change the behavior, change the file `mini.vim` and `./bin/server.js` which
are used for test purpose.

## Debugging / troubleshooting

Default location for log file would be `$XDG_RUNTIME_DIR/node-client.log`.

Use `$NODE_CLIENT_LOG_FILE` to specify full path of the log.

Use `$NODE_CLIENT_LOG_LEVEL` to specify the log level, which default to `info`,
could also be `debug` or `trace`.

Use `let g:node_client_debug = 1` in vim8 to enable logfile of vim8, use
`:call nvim#rpc#open_log()` to open vim8 logfile.

### Usage through node REPL

Note, it only works with neovim, you also need build this module from source code.

#### `NVIM_LISTEN_ADDRESS`

First, start Nvim with a known address (or use the \$NVIM_LISTEN_ADDRESS of a running instance):

    NVIM_LISTEN_ADDRESS=/tmp/nvim nvim

In another terminal, cd to root of this module then start node REPL by:

    NVIM_LISTEN_ADDRESS=/tmp/nvim node

connect to Nvim:

```javascript
let nvim
// `scripts/nvim` will detect if `NVIM_LISTEN_ADDRESS` is set and use that unix socket
require('./scripts/nvim').then(n => (nvim = n))

nvim.command('vsp')
```

## LICENSE

MIT
