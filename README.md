# neovim-client

<a href="https://github.com/neoclide/neovim/actions"><img alt="Actions" src="https://img.shields.io/github/actions/workflow/status/neoclide/neovim/ci.yml?style=flat-square&branch=neoclide"></a>

Fork of [neovim/node-client](https://github.com/neovim/node-client) which works
on both vim9 and neovim.

Currently works on node >= 8.

This module is used by [coc.nvim](https://github.com/neoclide/coc.nvim), you can
use this module to create extension for vim9 and neovim, but it's recommended to
build extension for coc.nvim.

## Build from source code

Git clone then run `npm install`.

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

## Debug on vim9

Build this module from source code, in root of project folder,
start the server by command: `vim -u mini.vim`.

Checkout the vim9's log file by `:Openlog` command.

Checkout log of node-client by open the file `$XDG_RUNTIME_DIR/node-client.log`.

To change the behavior, change the file `mini.vim` and `./bin/server.js` which
are used for test purpose.

## Debugging / troubleshooting

Default location for log file would be `$XDG_RUNTIME_DIR/node-client.log`.

Use `$NODE_CLIENT_LOG_FILE` to specify full path of the log.

Use `$NODE_CLIENT_LOG_LEVEL` to specify the log level, which default to `info`,
could also be `debug` or `trace`.

Use `let g:node_client_debug = 1` in vim9 to enable logfile of vim9, use
`:call nvim#rpc#open_log()` to open vim9 logfile.

### Usage through node REPL

The feature need build this module from source code.

#### Connect to neovim

First, start Nvim with a known address (or use the \$NVIM_LISTEN_ADDRESS of a running instance):

    NVIM_LISTEN_ADDRESS=/tmp/nvim nvim

In another terminal, cd to root of this module then start node REPL by:

    NVIM_LISTEN_ADDRESS=/tmp/nvim node

connect to Nvim:

```javascript
let nvim
// `scripts/nvim` will detect if `NVIM_LISTEN_ADDRESS` is set and use that unix socket
const nvim = require('./scripts/nvim')

vim.command('vsp')
```

#### Connect to vim9

First start node repl by `NVIM_REMOTE_ADDRESS=/tmp/client-vim.sock node` command.

Start remote server by javascript:

```javascript
const nvim = await require('./scripts/vim')
```
the command to start vim will be printed to stdout.

In other terminal and inside this project folder, run command:

```sh
NVIM_REMOTE_ADDRESS=/tmp/client-vim.sock vim -c 'source start.vim'
```

`start.vim` add the project directory to vim's `runtimepath` and connect to the
server.

Not work on windows yet.

## LICENSE

MIT
