if exists('g:did_node_rpc_loaded') || v:version < 800 || has('nvim')
  finish
endif
let g:did_node_rpc_loaded = 1

let s:root = expand('<sfile>:h:h:h')
let s:is_win = has("win32") || has("win64")
let s:logfile = tempname()
let s:channel = v:null

if get(g:, 'node_client_debug', 0)
  call ch_logfile(s:logfile, 'w')
endif

function! s:on_error(channel, msg)
  echohl Error | echom '[node-client] rpc error: ' .a:msg | echohl None
endfunction

function! s:on_notify(channel, result)
  echo a:result
endfunction

function! s:on_exit(job, status)
  if !get(g:, 'coc_vim_leaving', 0) && a:status != 0
    echohl Error | echom 'vim-node-rpc exited with code: '.a:status | echohl None
  endif
  let s:channel = v:null
endfunction

" use for test purpose.
function! nvim#rpc#start_server(file) abort
  if !empty(s:channel)
    let state = ch_status(s:channel)
    if state ==# 'open' || state ==# 'buffered'
      " running
      return 1
    endif
  endif
  let command =  ['node', a:file]
  let options = {
        \ 'in_mode': 'json',
        \ 'out_mode': 'json',
        \ 'err_mode': 'nl',
        \ 'callback': function('s:on_notify'),
        \ 'err_cb': function('s:on_error'),
        \ 'exit_cb': function('s:on_exit'),
        \ 'timeout': 30000,
        \ 'env': {
        \   'VIM_NODE_RPC': 1,
        \ }
        \}
  if has("patch-8.1.350")
    let options['noblock'] = 1
  endif
  let job = job_start(command, options)
  let s:channel = job_getchannel(job)
  let status = ch_status(job)
  if status !=# 'open'
    echohl Error | echon '[node-client] failed to start node-client service!' | echohl None
    return
  endif
  return 1
endfunction

function! nvim#rpc#request(method, args) abort
  let res = ch_evalexpr(s:channel, [a:method, a:args], {'timeout': 30000})
  if type(res) == 1 && res ==# '' | return '' | endif
  let [l:errmsg, res] =  res
  if !empty(l:errmsg)
    echohl Error | echon '[node-client] client error: '.l:errmsg | echohl None
  else
    return res
  endif
endfunction

function! nvim#rpc#notify(method, args) abort
  if empty(s:channel) | return | endif
  " use 0 as vim request id
  let data = json_encode([0, [a:method, a:args]])
  call ch_sendraw(s:channel, data."\n")
endfunction

function! nvim#rpc#open_log()
  execute 'vs '.s:logfile
endfunction
