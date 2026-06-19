/** PJSK database record */
export interface PJSK {
  id: number
  userId: string
  username: string
  fontSize: number
  curve: boolean
  characterId: number
  text: string
  x: number
  y: number
  spaceSize: number
  rotate: number
}

/** Option range validation */
export interface Range {
  min: number
  max: number
  message: string
}

/** QQ keyboard button */
export interface Button {
  render_data: {
    label: string
    visited_label: string
    style: number
  }
  action: {
    type: number
    permission: { type: number }
    data: string
    enter: boolean
  }
}

declare module 'koishi' {
  interface Tables {
    pjsk: PJSK
  }
}