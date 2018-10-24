/* eslint camelcase:0 */
export type Parameters = [string, string]

export type FunctionInfo = {
  parameters: Parameters[]
  method: boolean
  return_type: string
  name: string
  since: number
}

export type UiEventInfo = {
  parameters: Parameters[]
  name: string
  since: number
}

export type ApiInfo = {
  version: {
    major: number
    minor: number
    patch: number
    api_level: number
    api_compatible: number
    api_prerelease: number
  }
  functions: FunctionInfo[]
  ui_events: UiEventInfo[]
  ui_options: string[]
  error_types: object
  types: object
}
