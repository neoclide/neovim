import { Range } from '../types'
import { BaseApi } from './Base'

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

export interface ExtmarkOptions {
  id?: number
  // 0-based inclusive.
  end_line?: number
  // 0-based exclusive.
  end_col?: number
  //  name of the highlight group used to highlight this mark.
  hl_group?: string
  hl_mode?: 'replace' | 'combine' | 'blend'
  hl_eol?: boolean
  // A list of [text, highlight] tuples
  virt_text?: [string, string | string[]][]
  virt_text_pos?: 'eol' | 'overlay' | 'right_align'
  virt_text_win_col?: number
  virt_text_hide?: boolean
  virt_lines?: [string, string | string[]][][]
  virt_lines_above?: boolean
  virt_lines_leftcol?: boolean
  right_gravity?: boolean
  end_right_gravity?: boolean
  priority?: number
}

export interface ExtmarkDetails {
  end_col: number
  end_row: number
  priority: number
  hl_group?: string
  virt_text?: [string, string][]
  virt_lines?: [string, string | string][][]
}

export interface BufferClearHighlight {
  srcId?: number
  lineStart?: number
  lineEnd?: number
}

export interface SignPlaceOption {
  id?: number // 0
  group?: string // ''
  name: string
  lnum: number
  priority?: number
}

export interface SignUnplaceOption {
  group?: string
  id?: number
}

export interface SignPlacedOption {
  group?: string
  id?: number
  lnum?: number
}

export interface SignItem {
  group: string
  id: number
  lnum: number
  name: string
  priority: number
}

export interface HighlightItem {
  hlGroup: string
  /**
   * 0 based
   */
  lnum: number
  /**
   * 0 based
   */
  colStart: number
  /**
   * 0 based
   */
  colEnd: number
}

export interface KeymapOption {
  nowait?: boolean
  silent?: boolean
  script?: boolean
  expr?: boolean
  unique?: boolean
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
   * @deprecated Use setExtMark() instead.
   * @param {number} src_id - Source group to use or 0 to use a new group, or -1
   * @param {number} line - Line to annotate with virtual text (zero-indexed)
   * @param {Chunk[]} chunks - List with [text, hl_group]
   * @param {{[index} opts
   * @returns {Promise<number>}
   */
  public setVirtualText(src_id: number, line: number, chunks: Chunk[], opts: { [index: string]: any } = {}): Promise<number> {
    if (this.client.isVim) return Promise.resolve(-1)
    this.notify(`${this.prefix}set_virtual_text`, [
      src_id,
      line,
      chunks,
      opts,
    ])
    return Promise.resolve(src_id)
  }

  /**
   * Removes an ext mark by notification.
   *
   * @public
   * @param {number} ns_id - Namespace id
   * @param {number} id - Extmark id
   */
  public deleteExtMark(ns_id: number, id: number): void {
    if (this.client.isVim) return
    this.notify(`${this.prefix}del_extmark`, [
      ns_id,
      id,
    ])
  }

  /**
   * Gets the position (0-indexed) of an extmark.
   *
   * @param {number} ns_id - Namespace id
   * @param {number} id - Extmark id
   * @param {Object} opts - Optional parameters.
   * @returns {Promise<[] | [number, number] | [number, number, ExtmarkDetails]>}
   */
  public async getExtMarkById(ns_id: number, id: number, opts: { details?: boolean } = {}): Promise<[] | [number, number] | [number, number, ExtmarkDetails]> {
    if (this.client.isVim) return Promise.resolve([])
    return this.request(`${this.prefix}get_extmark_by_id`, [ns_id, id, opts])
  }

  /**
   * Gets extmarks in "traversal order" from a |charwise| region defined by
   * buffer positions (inclusive, 0-indexed |api-indexing|).
   *
   * Region can be given as (row,col) tuples, or valid extmark ids (whose
   * positions define the bounds). 0 and -1 are understood as (0,0) and (-1,-1)
   * respectively, thus the following are equivalent:
   *
   *     nvim_buf_get_extmarks(0, my_ns, 0, -1, {})
   *     nvim_buf_get_extmarks(0, my_ns, [0,0], [-1,-1], {})
   *
   * @param {number} ns_id - Namespace id
   * @param {[number, number] | number} start
   * @param {[number, number] | number} end
   * @param {Object} opts
   * @returns {Promise<[number, number, number, ExtmarkDetails?][]>}
   */
  public async getExtMarks(ns_id: number, start: [number, number] | number, end: [number, number] | number, opts: { details?: boolean, limit?: number } = {}): Promise<[number, number, number, ExtmarkDetails?][]> {
    if (this.client.isVim) return Promise.resolve([])
    return this.request(`${this.prefix}get_extmarks`, [ns_id, start, end, opts])
  }

  /**
   * Creates or updates an extmark by notification, `:h nvim_buf_set_extmark`.
   *
   * @param {number} ns_id
   * @param {number} line
   * @param {number} col
   * @param {ExtmarkOptions} opts
   * @returns {void}
   */
  public setExtMark(ns_id: number, line: number, col: number, opts: ExtmarkOptions = {}): void {
    if (this.client.isVim) return
    this.notify(`${this.prefix}set_extmark`, [
      ns_id,
      line,
      col,
      opts
    ])
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
   * Add keymap by notification.
   */
  public setKeymap(mode: string, lhs: string, rhs: string, opts: KeymapOption = {}): void {
    this.client.call('coc#compat#buf_add_keymap', [this.id, mode, lhs, rhs, opts], true)
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
   * @deprecated use clearNamespace() instead.
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
   * Add highlight to ranges by notification.
   *
   * @param {string | number} srcId Unique key or namespace number.
   * @param {string} hlGroup Highlight group.
   * @param {Range[]} ranges List of highlight ranges
   */
  public highlightRanges(srcId: string | number, hlGroup: string, ranges: Range[]): void {
    this.client.call('coc#highlight#ranges', [this.id, srcId, hlGroup, ranges], true)
  }

  /**
   * Clear namespace by id or name.
   *
   * @param key Unique key or namespace number, use -1 for all namespaces
   * @param lineStart Start of line, 0 based, default to 0.
   * @param lineEnd End of line, 0 based, default to -1.
   */
  clearNamespace(key: number | string, lineStart = 0, lineEnd = -1) {
    this.client.call('coc#highlight#clear_highlight', [this.id, key, lineStart, lineEnd], true)
  }

  /**
   * Add sign to buffer by notification.
   *
   * @param {SignPlaceOption} sign
   * @returns {void}
   */
  public placeSign(sign: SignPlaceOption): void {
    let opts: any = { lnum: sign.lnum }
    if (typeof sign.priority === 'number') opts.priority = sign.priority
    this.client.call('sign_place', [sign.id || 0, sign.group || '', sign.name, this.id, opts], true)
  }

  /**
   * Unplace signs by notification
   */
  public unplaceSign(opts: SignUnplaceOption): void {
    let details: any = { buffer: this.id }
    if (opts.id != null) details.id = opts.id
    this.client.call('sign_unplace', [opts.group || '', details], true)
  }

  /**
   * Get signs by group name or id and lnum.
   *
   * @param {SignPlacedOption} opts
   * @returns {Promise<SignItem[]>}
   */
  public async getSigns(opts: SignPlacedOption): Promise<SignItem[]> {
    let res = await this.client.call('sign_getplaced', [this.id, opts || {}]) as any[]
    return res[0].signs
  }

  /**
   * Get highlight items by name space (end exclusive).
   *
   * @param {string | number} ns Namespace key or id.
   * @param {number} start 0 based line number.
   * @param {number} end 0 based line number.
   * @returns {Promise<HighlightItem[]>}
   */
  public async getHighlights(ns: string | number, start = 0, end = -1): Promise<HighlightItem[]> {
    let res: HighlightItem[] = []
    let obj = await this.client.call('coc#highlight#get', [this.id, ns, start, end])
    for (let arr of Object.values(obj)) {
      if (Array.isArray(arr)) {
        res.push(...arr)
      }
    }
    return res
  }

  /**
   * Update highlight items by notification.
   *
   * @param {string | number} ns Namespace key or id.
   * @param {HighlightItem[]} highlights Highlight items.
   * @param {number} start 0 based line number.
   * @param {number} end 0 based line number.
   * @returns {void}
   */
  public updateHighlights(ns: string, highlights: HighlightItem[], start = 0, end = -1): void {
    if (start == 0 && end == -1) {
      let arr = highlights.map(o => [o.hlGroup, o.lnum, o.colStart, o.colEnd])
      this.client.call('coc#highlight#buffer_update', [this.id, ns, arr], true)
      return
    }
    this.client.call('coc#highlight#update_highlights', [this.id, ns, highlights, start, end], true)
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
