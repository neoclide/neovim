execute 'set runtimepath+='.expand('<sfile>:h')
call nvim#rpc#start_server()
