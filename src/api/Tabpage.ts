import { BaseApi } from './Base'
import { ExtType, Metadata } from './types'
import { Window } from './Window'

export class Tabpage extends BaseApi {
  public prefix: string = Metadata[ExtType.Tabpage].prefix

  /** Returns all windows of tabpage */
  public get windows(): Promise<Window[]> {
    return this.request(`${this.prefix}list_wins`, [this])
  }

  /** Gets the current window of tabpage */
  public get window(): Promise<Window> {
    return this.request(`${this.prefix}get_win`, [this])
  }

  /** Is current tabpage valid */
  public get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this])
  }

  /** Tabpage number */
  public get number(): Promise<number> {
    return this.request(`${this.prefix}get_number`, [this])
  }

  /** Invalid */
  public getOption(): any {
    throw new Error('Tabpage does not have `getOption`')
  }

  /** Invalid */
  public setOption(): any {
    throw new Error('Tabpage does not have `setOption`')
  }
}
