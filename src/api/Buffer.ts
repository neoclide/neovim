import { Range } from '../types'
import { BaseApi } from './Base'
import { ExtType, Metadata } from './types'

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

export interface Disposable {
  /**
   * Dispose this object.
   */
  dispose(): void
}

type Chunk = [string, string]

export class Buffer extends BaseApi {
  public prefix = 'nvim_buf_'

  /**
   * Attach to buffer to listen to buffer events
   * @param sendBuffer Set to true if the initial notification should contain
   *        the whole buffer. If so, the first notification will be a
   *        `nvim_buf_lines_event`. Otherwise, the first notification will be
   *        a `nvim_buf_changedtick_event`
   */
  public async attach(sendBuffer = false, options: {} = {}): Promise<boolean> {
    return await this.request(`${this.prefix}attach`, [sendBuffer, options])
  }

  /**
   * Detach from buffer to stop listening to buffer events
   */
  public async detach(): Promise<boolean> {
    return await this.request(`${this.prefix}detach`, [])
  }

  /**
   * Get the bufnr of Buffer
   */
  public get id(): number {
    return this.data as number
  }

  /** Total number of lines in buffer */
  public get length(): Promise<number> {
    return this.request(`${this.prefix}line_count`, [])
  }

  /** Get lines in buffer */
  public get lines(): Promise<string[]> {
    return this.getLines()
  }

  /** Gets a changed tick of a buffer */
  public get changedtick(): Promise<number> {
    return this.request(`${this.prefix}get_changedtick`, [])
  }

  public get commands(): Promise<Object> {
    return this.getCommands()
  }

  public getCommands(options = {}): Promise<Object> {
    return this.request(`${this.prefix}get_commands`, [options])
  }

  /** Get specific lines of buffer */
  public getLines(
    { start, end, strictIndexing } = { start: 0, end: -1, strictIndexing: true }
  ): Promise<string[]> {
    const indexing =
      typeof strictIndexing === 'undefined' ? true : strictIndexing
    return this.request(`${this.prefix}get_lines`, [
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
    },
    notify = false
  ) {
    // TODO: Error checking
    // if (typeof start === 'undefined' || typeof end === 'undefined') {
    // }
    const indexing =
      typeof strictIndexing === 'undefined' ? true : strictIndexing
    const lines = typeof _lines === 'string' ? [_lines] : _lines
    const end = typeof _end !== 'undefined' ? _end : _start + 1
    const method = notify ? 'notify' : 'request'

    return this[method](`${this.prefix}set_lines`, [
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
  public setVirtualText(src_id: number, line: number, chunks: Chunk[], opts: { [index: string]: any } = {}): Promise<number> {
    this.notify(`${this.prefix}set_virtual_text`, [
      src_id,
      line,
      chunks,
      opts,
    ])
    return Promise.resolve(src_id)
  }

  /** Insert lines at `start` index */
  insert(lines: string[] | string, start: number) {
    return this.setLines(lines, {
      start,
      end: start,
      strictIndexing: true,
    })
  }

  /** Replace lines starting at `start` index */
  replace(_lines: string[] | string, start: number) {
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
  append(lines: string[] | string) {
    return this.setLines(lines, {
      start: -1,
      end: -1,
      strictIndexing: false,
    })
  }

  /** Get buffer name */
  public get name(): Promise<string> {
    return this.request(`${this.prefix}get_name`, [])
  }

  /** Set current buffer name */
  public setName(value: string): Promise<void> {
    return this.request(`${this.prefix}set_name`, [value])
  }

  /** Is current buffer valid */
  public get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [])
  }

  /** Get mark position given mark name */
  public mark(name: string): Promise<[number, number]> {
    return this.request(`${this.prefix}get_mark`, [name])
  }

  // range(start, end) {
  // """Return a `Range` object, which represents part of the Buffer."""
  // return Range(this, start, end)
  // }

  /** Gets keymap */
  public getKeymap(mode: string): Promise<object[]> {
    return this.request(`${this.prefix}get_keymap`, [mode])
  }

  /**
 * Checks if a buffer is valid and loaded. See |api-buffer| for
 * more info about unloaded buffers.
 */
  public get loaded(): Promise<boolean> {
    return this.request(`${this.prefix}is_loaded`, [])
  }

  /**
   * Returns the byte offset for a line.
   *
   * Line 1 (index=0) has offset 0. UTF-8 bytes are counted. EOL is
   * one byte. 'fileformat' and 'fileencoding' are ignored. The
   * line index just after the last line gives the total byte-count
   * of the buffer. A final EOL byte is counted if it would be
   * written, see 'eol'.
   *
   * Unlike |line2byte()|, throws error for out-of-bounds indexing.
   * Returns -1 for unloaded buffer.
   *
   * @return {Number} Integer byte offset, or -1 for unloaded buffer.
   */
  public getOffset(index: number): Promise<number> {
    return this.request(`${this.prefix}get_offset`, [index])
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
  public addHighlight({
    hlGroup,
    line,
    colStart: _start,
    colEnd: _end,
    srcId: _srcId,
  }: BufferHighlight): Promise<number | null> {
    if (!hlGroup) throw new Error('hlGroup should not empty')
    const colEnd = typeof _end !== 'undefined' ? _end : -1
    const colStart = typeof _start !== 'undefined' ? _start : -0
    const srcId = typeof _srcId !== 'undefined' ? _srcId : -1
    const method = srcId == 0 ? 'request' : 'notify'
    let res = this[method](`${this.prefix}add_highlight`, [
      srcId,
      hlGroup,
      line,
      colStart,
      colEnd,
    ])
    return method === 'request' ? res as Promise<number> : Promise.resolve(null)
  }

  /**
   * Clear highlights of specified lins.
   *
   * @deprecated use clearNamespace instead.
   */
  clearHighlight(args: BufferClearHighlight = {}) {
    const defaults = {
      srcId: -1,
      lineStart: 0,
      lineEnd: -1,
    }

    const { srcId, lineStart, lineEnd } = Object.assign({}, defaults, args)

    return this.notify(`${this.prefix}clear_highlight`, [
      srcId,
      lineStart,
      lineEnd,
    ])
  }

  /**
   * Add highlight to ranges.
   *
   * @param {string | number} srcId Unique key or namespace number.
   * @param {string} hlGroup Highlight group.
   * @param {Range[]} ranges List of highlight ranges
   */
  public highlightRanges(srcId: string | number, hlGroup: string, ranges: Range[]): void {
    for (let range of ranges) {
      this.client.call('coc#highlight#range', [this.id, srcId, hlGroup, range], true)
    }
  }

  /**
   * Clear namespace by id or name.
   *
   * @param key Unique key or namespace number, use -1 for all namespaces
   * @param lineStart Start of line, 0 based, default to 0.
   * @param lineEnd End of line, 0 based, default to -1.
   */
  clearNamespace(key: number | string, lineStart = 0, lineEnd = -1) {
    this.client.call('coc#highlight#clear_highlight', [this.id, key, lineStart, lineEnd])
  }

  /**
   * Listens to buffer for events
   */
  public listen(eventName: string, cb: Function, disposables?: Disposable[]): void {
    this.client.attachBufferEvent(this, eventName, cb)
    if (disposables) {
      disposables.push({
        dispose: () => {
          this.client.detachBufferEvent(this, eventName, cb)
        }
      })
    }
  }
}
