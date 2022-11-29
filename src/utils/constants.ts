'use strict'
export const isVim = process.env.VIM_NODE_RPC == '1'

export const isCocNvim = process.env.COC_NVIM == '1'

export const isTester = process.env.COC_TESTER == '1'
