import { ApiInfo } from '../types/ApiInfo' // eslint-disable-line
import { VimValue } from '../types/VimValue'
import { BaseApi } from './Base'
import { Buffer } from './Buffer'
import { Tabpage } from './Tabpage'
import { Window } from './Window'
import { FloatOptions } from './types'
const isVim = process.env.VIM_NODE_RPC == '1'

export interface UiAttachOptions {
  rgb?: boolean
  // eslint-disable-next-line camelcase
  ext_popupmenu?: boolean
  // eslint-disable-next-line camelcase
  ext_tabline?: boolean
  // eslint-disable-next-line camelcase
  ext_wildmenu?: boolean
  // eslint-disable-next-line camelcase
  ext_cmdline?: boolean
  // eslint-disable-next-line camelcase
  ext_linegrid?: boolean
  // eslint-disable-next-line camelcase
  ext_hlstate?: boolean
}

export interface Proc {
  ppid: number
  name: string
  pid: number
}

/**
 * Neovim API
 */
export class Neovim extends BaseApi {
  protected prefix = 'nvim_'
  public Buffer = Buffer
  public Window = Window
  public Tabpage = Tabpage

  private getArgs(args?: VimValue | VimValue[]): VimValue[] {
    if (!args) return []
    if (Array.isArray(args)) return args
    return [args]
  }

  public get apiInfo(): Promise<[number, ApiInfo]> {
    return this.request(`${this.prefix}get_api_info`)
  }

  /** Get list of all buffers */
  public get buffers(): Promise<Buffer[]> {
    return this.request(`${this.prefix}list_bufs`)
  }

  /** Get current buffer */
  public get buffer(): Promise<Buffer> {
    return this.request(`${this.prefix}get_current_buf`)
  }

  /** Set current buffer */
  public async setBuffer(buffer: Buffer): Promise<void> {
    await this.request(`${this.prefix}set_current_buf`, [buffer])
  }

  public get chans(): Promise<number[]> {
    return this.request(`${this.prefix}list_chans`)
  }

  public getChanInfo(chan: number): Promise<object> {
    return this.request(`${this.prefix}get_chan_info`, [chan])
  }

  public createNamespace(name = ""): Promise<number> {
    return this.request(`${this.prefix}create_namespace`, [name])
  }

  public get namespaces(): Promise<{ [name: string]: number }> {
    return this.request(`${this.prefix}get_namespaces`, [name])
  }

  public get commands(): Promise<Object> {
    return this.getCommands()
  }

  public getCommands(options = {}): Promise<Object> {
    return this.request(`${this.prefix}get_commands`, [options])
  }

  /** Get list of all tabpages */
  public get tabpages(): Promise<Tabpage[]> {
    return this.request(`${this.prefix}list_tabpages`)
  }

  /** Get current tabpage */
  public get tabpage(): Promise<Tabpage> {
    return this.request(`${this.prefix}get_current_tabpage`)
  }

  /** Set current tabpage */
  public async setTabpage(tabpage: Tabpage): Promise<void> {
    await this.request(`${this.prefix}set_current_tabpage`, [tabpage])
  }

  /** Get list of all windows */
  public get windows(): Promise<Window[]> {
    return this.getWindows()
  }

  /** Get current window */
  public get window(): Promise<Window> {
    return this.request(`${this.prefix}get_current_win`)
  }

  /** Get list of all windows */
  public getWindows(): Promise<Window[]> {
    return this.request(`${this.prefix}list_wins`)
  }

  public async setWindow(win: Window): Promise<void> {
    // Throw error if win is not instance of Window?
    await this.request(`${this.prefix}set_current_win`, [win])
  }

  /** Get list of all runtime paths */
  public get runtimePaths(): Promise<string[]> {
    return this.request(`${this.prefix}list_runtime_paths`)
  }

  /** Set current directory */
  public setDirectory(dir: string): Promise<void> {
    return this.request(`${this.prefix}set_current_dir`, [dir])
  }

  /** Get current line. Always returns a Promise. */
  public get line(): Promise<string> {
    return this.getLine()
  }

  public createNewBuffer(listed = false, scratch = false): Promise<Buffer> {
    return this.request(`${this.prefix}create_buf`, [listed, scratch])
  }

  public openFloatWindow(buffer: Buffer, enter: boolean, options: FloatOptions): Promise<Window> {
    return this.request(`${this.prefix}open_win`, [buffer, enter, options])
  }

  public getLine(): Promise<string> {
    return this.request(`${this.prefix}get_current_line`)
  }

  /** Set current line */
  public setLine(line: string): Promise<any> {
    return this.request(`${this.prefix}set_current_line`, [line])
  }

  /** Gets keymap */
  public getKeymap(mode: string): Promise<object[]> {
    return this.request(`${this.prefix}get_keymap`, [mode])
  }

  /** Gets current mode */
  public get mode(): Promise<{ mode: string; blocking: boolean }> {
    return this.request(`${this.prefix}get_mode`)
  }

  /** Gets map of defined colors */
  public get colorMap(): Promise<{ [name: string]: number }> {
    return this.request(`${this.prefix}get_color_map`)
  }

  /** Get color by name */
  public getColorByName(name: string): Promise<number> {
    return this.request(`${this.prefix}get_color_by_name`, [name])
  }

  /** Get highlight by name or id */
  public getHighlight(
    nameOrId: string | number,
    isRgb = true
  ): Promise<object> | void {
    const functionName = typeof nameOrId === 'string' ? 'by_name' : 'by_id'
    return this.request(`${this.prefix}get_hl_${functionName}`, [
      nameOrId,
      isRgb,
    ])
  }

  public getHighlightByName(name: string, isRgb = true): Promise<object> {
    return this.request(`${this.prefix}get_hl_by_name`, [name, isRgb])
  }

  public getHighlightById(id: number, isRgb = true): Promise<object> {
    return this.request(`${this.prefix}get_hl_by_id`, [id, isRgb])
  }

  /** Delete current line in buffer */
  public deleteCurrentLine(): Promise<any> {
    return this.request(`${this.prefix}del_current_line`)
  }

  /**
   * Evaluates a VimL expression (:help expression). Dictionaries
   * and Lists are recursively expanded. On VimL error: Returns a
   * generic error; v:errmsg is not updated.
   *
   */
  public eval(expr: string): Promise<VimValue> {
    return this.request(`${this.prefix}eval`, [expr])
  }

  /**
   * Executes lua, it's possible neovim client does not support this
   */
  public lua(code: string, args: VimValue[] = []): Promise<object> {
    const _args = this.getArgs(args)
    return this.request(`${this.prefix}execute_lua`, [code, _args])
  }

  // Alias for `lua()` to be consistent with neovim API
  public executeLua(code: string, args: VimValue[] = []): Promise<object> {
    return this.lua(code, args)
  }

  public callDictFunction(
    dict: object,
    fname: string,
    args: VimValue | VimValue[] = []
  ): object {
    const _args = this.getArgs(args)
    return this.request(`${this.prefix}call_dict_function`, [
      dict,
      fname,
      _args,
    ])
  }

  /** Call a vim function */
  public call(fname: string, args?: VimValue | VimValue[]): Promise<any>
  public call(fname: string, args: VimValue | VimValue[], isNotify: true): null
  public call(fname: string, args: VimValue | VimValue[] = [], isNotify?: boolean): Promise<any | null> {
    const _args = this.getArgs(args)
    if (isNotify) {
      this.notify(`${this.prefix}call_function`, [fname, _args])
      return null
    }
    return this.request(`${this.prefix}call_function`, [fname, _args])
  }

  /** Call a function with timer on vim*/
  public callTimer(fname: string, args?: VimValue | VimValue[]): Promise<null>
  public callTimer(fname: string, args: VimValue | VimValue[], isNotify: true): null
  public callTimer(fname: string, args: VimValue | VimValue[] = [], isNotify?: boolean): Promise<null> {
    const _args = this.getArgs(args)
    if (isNotify) {
      this.notify(`${this.prefix}call_function`, ['coc#util#timer', [fname, _args]])
      return null
    }
    if (isVim) {
      this.notify(`${this.prefix}call_function`, ['coc#util#timer', [fname, _args]])
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(null)
        }, 20)
      })
    }
    return this.request(`${this.prefix}call_function`, ['coc#util#timer', [fname, _args]])
  }

  public callAsync(fname: string, args: VimValue | VimValue[] = []): Promise<any> {
    const _args = this.getArgs(args)
    return this.client.sendAsyncRequest(fname, _args)
  }

  /** Alias for `call` */
  public callFunction(fname: string, args: VimValue | VimValue[] = []): Promise<any> | null {
    return this.call(fname, args)
  }

  /** Call Atomic calls */
  public callAtomic(calls: [string, VimValue[]][]): Promise<[any[], boolean]> {
    return this.request(`${this.prefix}call_atomic`, [calls])
  }

  /** Runs a vim command */
  public command(arg: string): Promise<any>
  public command(arg: string, isNotify: true): null
  public command(arg: string, isNotify?: boolean): Promise<any> | null {
    if (isNotify) {
      this.notify(`${this.prefix}command`, [arg])
      return null
    }
    return this.request(`${this.prefix}command`, [arg])
  }

  /** Runs a command and returns output (synchronous?) */
  public commandOutput(arg: string): Promise<string> {
    return this.request(`${this.prefix}command_output`, [arg])
  }

  /** Gets a v: variable */
  public getVvar(name: string): Promise<VimValue> {
    return this.request(`${this.prefix}get_vvar`, [name])
  }

  /** feedKeys */
  public feedKeys(keys: string, mode: string, escapeCsi: boolean): Promise<any> {
    return this.request(`${this.prefix}feedkeys`, [keys, mode, escapeCsi])
  }

  /** Sends input keys */
  public input(keys: string): Promise<number> {
    return this.request(`${this.prefix}input`, [keys])
  }

  /**
   * Parse a VimL Expression
   *
   * TODO: return type, see :help
   */
  public parseExpression(
    expr: string,
    flags: string,
    highlight: boolean
  ): Promise<object> {
    return this.request(`${this.prefix}parse_expression`, [
      expr,
      flags,
      highlight,
    ])
  }

  public getProc(pid: number): Promise<Proc> {
    return this.request(`${this.prefix}get_proc`, [pid])
  }

  public getProcChildren(pid: number): Promise<Proc[]> {
    return this.request(`${this.prefix}get_proc_children`, [pid])
  }

  /** Replace term codes */
  public replaceTermcodes(
    str: string,
    fromPart: boolean,
    doIt: boolean,
    special: boolean
  ): Promise<string> {
    return this.request(`${this.prefix}replace_termcodes`, [
      str,
      fromPart,
      doIt,
      special,
    ])
  }

  /** Gets width of string */
  public strWidth(str: string): Promise<number> {
    return this.request(`${this.prefix}strwidth`, [str])
  }

  /** Write to output buffer */
  public outWrite(str: string): void {
    this.notify(`${this.prefix}out_write`, [str])
  }

  public outWriteLine(str: string): void {
    this.outWrite(`${str}\n`)
  }

  /** Write to error buffer */
  public errWrite(str: string): void {
    this.notify(`${this.prefix}err_write`, [str])
  }

  /** Write to error buffer */
  public errWriteLine(str: string): void {
    this.notify(`${this.prefix}err_writeln`, [str])
  }

  // TODO: add type
  public get uis(): Promise<any[]> {
    return this.request(`${this.prefix}list_uis`)
  }

  public uiAttach(
    width: number,
    height: number,
    options: UiAttachOptions
  ): Promise<void> {
    return this.request(`${this.prefix}ui_attach`, [width, height, options])
  }

  public uiDetach(): Promise<void> {
    return this.request(`${this.prefix}ui_detach`, [])
  }

  public uiTryResize(width: number, height: number): Promise<void> {
    return this.request(`${this.prefix}ui_try_resize`, [width, height])
  }

  /** Set UI Option */
  public uiSetOption(name: string, value: any): Promise<void> {
    return this.request(`${this.prefix}ui_set_option`, [name, value])
  }

  /** Subscribe to nvim event broadcasts */
  public subscribe(event: string): Promise<void> {
    return this.request(`${this.prefix}subscribe`, [event])
  }

  /** Unsubscribe to nvim event broadcasts */
  public unsubscribe(event: string): Promise<void> {
    return this.request(`${this.prefix}unsubscribe`, [event])
  }

  public setClientInfo(
    name: string,
    version: object,
    type: string,
    methods: object,
    attributes: object
  ): void {
    this.notify(`${this.prefix}set_client_info`, [
      name,
      version,
      type,
      methods,
      attributes,
    ])
  }

  /** Quit nvim */
  public async quit(): Promise<void> {
    this.command('qa!', true)
    if (this.transport) {
      this.transport.detach()
    }
  }
}
