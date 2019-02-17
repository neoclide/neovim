import { Buffer } from './Buffer'
import { Window } from './Window'
import { Tabpage } from './Tabpage'

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
  unfocusable?: boolean
  relative?: 'editor' | 'cursor' | 'none'
  anchor?: 'NW' | 'NE' | 'SW' | 'SE'
  row: number
  col: number
}

export type MetadataType = {
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
