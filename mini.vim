set nocompatible

let s:root = expand('<sfile>:h')
let g:node_client_debug = 1
execute 'set rtp+='.fnameescape(s:root)
let file = s:root.'/bin/server.js'
call nvim#rpc#start_server(file)

command! -nargs=? Openlog :call nvim#rpc#open_log()

function! ErrorFunc()
  throw 'my error'
endfunction
