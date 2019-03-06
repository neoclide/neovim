import { BaseApi } from './Base'
import { Buffer } from './Buffer'
import { Tabpage } from './Tabpage'
import { ExtType, FloatOptions, Metadata } from './types'

export class Window extends BaseApi {
  public prefix: string = Metadata[ExtType.Window].prefix

  /**
   * The windowid that not change within a Vim session
   */
  public get id(): number {
    return this.data as number
  }

  /** Get current buffer of window */
  public get buffer(): Promise<Buffer> {
    return this.request(`${this.prefix}get_buf`, [this])
  }

  /** Get the Tabpage that contains the window */
  public get tabpage(): Promise<Tabpage> {
    return this.request(`${this.prefix}get_tabpage`, [this])
  }

  /** Get cursor position */
  public get cursor(): [number, number] | Promise<[number, number]> {
    return this.request(`${this.prefix}get_cursor`, [this])
  }

  /** Set cursor position */
  public set cursor(pos: [number, number] | Promise<[number, number]>) {
    this.request(`${this.prefix}set_cursor`, [this, pos])
  }

  /** Get window height by number of rows */
  public get height(): number | Promise<number> {
    return this.request(`${this.prefix}get_height`, [this])
  }

  /** Set window height by number of rows */
  public set height(height: number | Promise<number>) {
    this.request(`${this.prefix}set_height`, [this, height])
  }

  /** Get window width by number of columns */
  public get width(): number | Promise<number> {
    return this.request(`${this.prefix}get_width`, [this])
  }

  /** Set window width by number of columns  */
  public set width(width: number | Promise<number>) {
    this.request(`${this.prefix}set_width`, [this, width])
  }

  /** Get window position */
  public get position(): Promise<[number, number]> {
    return this.request(`${this.prefix}get_position`, [this])
  }

  /** 0-indexed, on-screen window position(row) in display cells. */
  public get row(): Promise<number> {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[0]
    )
  }

  /** 0-indexed, on-screen window position(col) in display cells. */
  public get col(): Promise<number> {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[1]
    )
  }

  /** Is window valid */
  public get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this])
  }

  /** Get window number */
  public get number(): Promise<number> {
    return this.request(`${this.prefix}get_number`, [this])
  }

  public configFloat(width: number, height: number, options: FloatOptions): Promise<any>
  public configFloat(width: number, height: number, options: FloatOptions, isNotify: true): null
  public configFloat(width: number, height: number, options: FloatOptions, isNotify?: boolean): Promise<void> {
    let method = isNotify ? 'notify' : 'request'
    return this[method](`${this.prefix}config`, [this, width, height, options])
  }

  public close(force = true): Promise<void> {
    return this.request(`${this.prefix}close`, [this, force])
  }
}
