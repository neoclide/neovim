import { NeovimClient } from '../api/client'

process.env.VIM_NODE_RPC = '1'
const helper = require('./helper')

let nvim: NeovimClient
beforeAll(async () => {
  nvim = await helper.setupVim()
})

afterAll(async () => {
  await helper.shutdown()
})

describe('Vim commands', () => {
  it('should eval', async () => {
    let res = await nvim.evalVim('1+1')
    expect(res).toBe(2)
    await expect(async () => {
      await nvim.evalVim('unknown')
    }).rejects.toThrow(Error)
    nvim.redrawVim()
  })

  it('should call vim function', async () => {
    // notify
    nvim.callVim('execute', ['let g:x = 33'], true)
    let res = await nvim.getVar('x')
    expect(res).toBe(33)
    // request
    res = await nvim.callVim('execute', ['echo "foo"'])
    expect(res).toMatch('foo')
    // error
    await expect(async () => {
      await nvim.callVim('not_exists_function')
    }).rejects.toThrow(Error)
  })

  it('should run vim command', async () => {
    nvim.exVim('let g:x = 666')
    let res = await nvim.getVar('x')
    expect(res).toBe(666)
  })
})

