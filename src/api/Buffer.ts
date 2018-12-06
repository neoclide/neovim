import { BaseApi } from './Base'
import { ExtType, Metadata } from './types'
import { ATTACH_BUFFER, DETACH_BUFFER } from './client'

export interface BufferSetLines {
  start?: number
  end?: number
  strictIndexing?: boolean
}
export interface BufferHighlight {
  hlGroup?: string
  line?: number
  colStart?: number
  colEnd?: number
  srcId?: number
}
export interface BufferClearHighlight {
  srcId?: number
  lineStart?: number
  lineEnd?: number
}

type Chunk = [string, string]

export class Buffer extends BaseApi {
  public prefix: string = Metadata[ExtType.Buffer].prefix

  public get isAttached() {
    return this.client.isAttached(this.id)
  }

  /**
   * Attach to buffer to listen to buffer events
   * @param sendBuffer Set to true if the initial notification should contain
   *        the whole buffer. If so, the first notification will be a
   *        `nvim_buf_lines_event`. Otherwise, the first notification will be
   *        a `nvim_buf_changedtick_event`
   */
  public async attach(sendBuffer: boolean = false, options: {} = {}): Promise<boolean> {
    if (this.isAttached) return true
    let res = false
    try {
      res = await this.request(`${this.prefix}attach`, [this, sendBuffer, options])
    } catch (e) {
      res = false
    }
    if (res) {
      this.client[ATTACH_BUFFER](this)
    }
    return this.isAttached
  }

  /**
   * Detach from buffer to stop listening to buffer events
   */
  public async detach(): Promise<void> {
    this.client[DETACH_BUFFER](this)
    try {
      await this.request(`${this.prefix}detach`, [this])
    } catch (e) {
      // noop
    }
  }

  /**
   * Get the bufnr of Buffer
   */
  get id(): number {
    return this.data as number
  }

  /** Total number of lines in buffer */
  get length(): Promise<number> {
    return this.request(`${this.prefix}line_count`, [this])
  }

  /** Get lines in buffer */
  get lines(): Promise<Array<string>> {
    return this.getLines()
  }

  /** Gets a changed tick of a buffer */
  get changedtick(): Promise<number> {
    return this.request(`${this.prefix}get_changedtick`, [this])
  }

  get commands(): Promise<Object> {
    return this.getCommands()
  }

  getCommands(options = {}): Promise<Object> {
    return this.request(`${this.prefix}get_commands`, [this, options])
  }

  /** Get specific lines of buffer */
  getLines(
    { start, end, strictIndexing } = { start: 0, end: -1, strictIndexing: true }
  ): Promise<Array<string>> {
    const indexing =
      typeof strictIndexing === 'undefined' ? true : strictIndexing
    return this.request(`${this.prefix}get_lines`, [
      this,
      start,
      end,
      indexing,
    ])
  }

  /** Set lines of buffer given indeces */
  setLines(
    _lines: string | string[],
    { start: _start, end: _end, strictIndexing }: BufferSetLines = {
      strictIndexing: true,
    }
  ) {
    // TODO: Error checking
    // if (typeof start === 'undefined' || typeof end === 'undefined') {
    // }
    const indexing =
      typeof strictIndexing === 'undefined' ? true : strictIndexing
    const lines = typeof _lines === 'string' ? [_lines] : _lines
    const end = typeof _end !== 'undefined' ? _end : _start + 1

    return this.request(`${this.prefix}set_lines`, [
      this,
      _start,
      end,
      indexing,
      lines,
    ])
  }

  /**
   * Set virtual text for a line
   *
   * @public
   * @param {number} src_id - Source group to use or 0 to use a new group, or -1
   * @param {number} line - Line to annotate with virtual text (zero-indexed)
   * @param {Chunk[]} chunks - List with [text, hl_group]
   * @param {{[index} opts
   * @returns {Promise<number>}
   */
  setVirtualText(src_id: number, line: number, chunks: Chunk[], opts: { [index: string]: any } = {}): Promise<number> {
    return this.request(`${this.prefix}set_virtual_text`, [
      this,
      src_id,
      line,
      chunks,
      opts,
    ])
  }

  /** Insert lines at `start` index */
  insert(lines: Array<string> | string, start: number) {
    return this.setLines(lines, {
      start,
      end: start,
      strictIndexing: true,
    })
  }

  /** Replace lines starting at `start` index */
  replace(_lines: Array<string> | string, start: number) {
    const lines = typeof _lines === 'string' ? [_lines] : _lines
    return this.setLines(lines, {
      start,
      end: start + lines.length,
      strictIndexing: false,
    })
  }

  /** Remove lines at index */
  remove(start: number, end: number, strictIndexing = false) {
    return this.setLines([], { start, end, strictIndexing })
  }

  /** Append a string or list of lines to end of buffer */
  append(lines: Array<string> | string) {
    return this.setLines(lines, {
      start: -1,
      end: -1,
      strictIndexing: false,
    })
  }

  /** Get buffer name */
  get name(): Promise<string> {
    return this.request(`${this.prefix}get_name`, [this])
  }

  /** Set current buffer name */
  setName(value: string): Promise<void> {
    return this.request(`${this.prefix}set_name`, [this, value])
  }

  /** Is current buffer valid */
  get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this])
  }

  /** Get mark position given mark name */
  mark(name: string): Promise<[number, number]> {
    return this.request(`${this.prefix}get_mark`, [this, name])
  }

  // range(start, end) {
  // """Return a `Range` object, which represents part of the Buffer."""
  // return Range(this, start, end)
  // }

  /** Gets keymap */
  getKeymap(mode: string): Promise<Array<object>> {
    return this.request(`${this.prefix}get_keymap`, [this, mode])
  }

  /**
    Adds a highlight to buffer.

    This can be used for plugins which dynamically generate
    highlights to a buffer (like a semantic highlighter or
    linter). The function adds a single highlight to a buffer.
    Unlike matchaddpos() highlights follow changes to line
    numbering (as lines are inserted/removed above the highlighted
    line), like signs and marks do.

    "src_id" is useful for batch deletion/updating of a set of
    highlights. When called with src_id = 0, an unique source id
    is generated and returned. Succesive calls can pass in it as
    "src_id" to add new highlights to the same source group. All
    highlights in the same group can then be cleared with
    nvim_buf_clear_highlight. If the highlight never will be
    manually deleted pass in -1 for "src_id".

    If "hl_group" is the empty string no highlight is added, but a
    new src_id is still returned. This is useful for an external
    plugin to synchrounously request an unique src_id at
    initialization, and later asynchronously add and clear
    highlights in response to buffer changes. */
  addHighlight({
    hlGroup: _hlGroup,
    line,
    colStart: _start,
    colEnd: _end,
    srcId: _srcId,
  }: BufferHighlight): Promise<number | null> {
    const hlGroup = typeof _hlGroup !== 'undefined' ? _hlGroup : ''
    const colEnd = typeof _end !== 'undefined' ? _end : -1
    const colStart = typeof _start !== 'undefined' ? _start : -0
    const srcId = typeof _srcId !== 'undefined' ? _srcId : -1
    const method = hlGroup === '' ? 'request' : 'notify'
    let res = this[method](`${this.prefix}add_highlight`, [
      this,
      srcId,
      hlGroup,
      line,
      colStart,
      colEnd,
    ])
    return method === 'request' ? res as Promise<number> : Promise.resolve(null)
  }

  /** Clears highlights from a given source group and a range of
  lines
  To clear a source group in the entire buffer, pass in 1 and -1
  to lineStart and lineEnd respectively. */
  clearHighlight(args: BufferClearHighlight = {}) {
    const defaults = {
      srcId: -1,
      lineStart: 0,
      lineEnd: -1,
    }

    const { srcId, lineStart, lineEnd } = Object.assign({}, defaults, args)

    return this.notify(`${this.prefix}clear_highlight`, [
      this,
      srcId,
      lineStart,
      lineEnd,
    ])
  }

  /**
   * Listens to buffer for events
   */
  listen(eventName: string, cb: Function): Function {
    if (!this.isAttached) {
      throw new Error('buffer not attached')
    }
    this.client.attachBufferEvent(this, eventName, cb)
    return () => {
      this.unlisten(eventName, cb)
    }
  }

  unlisten(eventName: string, cb: Function) {
    this.client.detachBufferEvent(this, eventName, cb)
  }
}

export interface AsyncBuffer extends Buffer, Promise<Buffer> { }
