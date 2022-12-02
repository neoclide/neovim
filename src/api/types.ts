import { Buffer } from './Buffer'
import { Window } from './Window'
import { Tabpage } from './Tabpage'

export interface Disposable {
  /**
   * Dispose this object.
   */
  dispose(): void
}

export enum ExtType {
  Buffer,
  Window,
  Tabpage,
}
export interface ExtTypeConstructor<T> {
  new(...args: any[]): T
}

export interface FloatOptions {
  standalone?: boolean
  focusable?: boolean
  relative?: 'editor' | 'cursor' | 'win'
  anchor?: 'NW' | 'NE' | 'SW' | 'SE'
  height: number
  width: number
  row: number
  col: number
}

export interface MetadataType {
  constructor: ExtTypeConstructor<Buffer | Tabpage | Window>
  name: string
  prefix: string
}

export const Metadata: MetadataType[] = [
  {
    constructor: Buffer,
    name: 'Buffer',
    prefix: 'nvim_buf_',
  },
  {
    constructor: Window,
    name: 'Window',
    prefix: 'nvim_win_',
  },
  {
    constructor: Tabpage,
    name: 'Tabpage',
    prefix: 'nvim_tabpage_',
  },
]
