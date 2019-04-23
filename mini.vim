set nocompatible

let s:root = expand('<sfile>:h')
"let g:nvim_node_rpc_debug = 1
execute 'set rtp+='.fnameescape(s:root)
call nvim#rpc#start_server()

command! -nargs=? Openlog :call nvim#rpc#open_log()

function! ErrorFunc()
  throw 'my error'
endfunction
