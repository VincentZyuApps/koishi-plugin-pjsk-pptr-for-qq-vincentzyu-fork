import { readFileSync, openSync, readSync, closeSync, accessSync, constants, existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } from 'fs'
import { h } from 'koishi'
import path from 'path'
import { Range } from './type'
import { characters, characterNames } from './const'

/** Get dimensions of a PNG image (height normalized to targetHeight) */
export function getImgDimensions(imgPath: string, targetHeight: number = 33): { w: number, h: number } {
  let fd
  try {
    fd = openSync(imgPath, 'r')
    const buffer = Buffer.alloc(24)
    readSync(fd, buffer, 0, 24, 0)
    if (buffer.toString('utf8', 1, 4) === 'PNG') {
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      return { w: Math.round(width * (targetHeight / height)), h: Math.round(targetHeight) }
    }
  } catch (e) {
    // ignore
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd) } catch (e) { /* ignore */ }
    }
  }
  return { w: Math.round(targetHeight), h: Math.round(targetHeight) }
}

/** Find the longest line in text (accounting for CJK width) */
export function findLongestLine(text: string): string {
  const lines = text.replace(/\\n/g, '\n').split('\n')
  let maxLength = 0
  let longestLine = ''

  for (const line of lines) {
    let length = 0
    for (const char of line.trim()) {
      length += char.charCodeAt(0) > 255 ? 1 : 0.5
    }

    if (length > maxLength) {
      maxLength = length
      longestLine = line
    }
  }

  return longestLine
}

/** Count ASCII English letters in text */
export function countEnglishLetters(text: string): number {
  const englishLettersRegex = /[a-zA-Z]/g
  const englishLetters = text.match(englishLettersRegex)
  return englishLetters ? englishLetters.length : 0
}

/** Check if text contains English letters */
export function containsEnglishLetter(text: string): boolean {
  return /[a-zA-Z]/.test(text)
}

/** Check if text contains Chinese characters */
export function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
}

/** Check if a file exists */
export function checkFileExists(filePath: string): boolean {
  try {
    accessSync(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/** Calculate position offsets based on text length and curve option */
export function calculateOffsets(longestLine: string, options: any): { x: number; y: number } {
  const offsets = { x: 0, y: 0 }

  if (options.curve) {
    if (longestLine.length <= 5) {
      offsets.x = -20
      offsets.y = 200
    } else {
      if (longestLine.length >= 8) {
        offsets.x = containsChinese(longestLine) ? -30 : -60
        offsets.y = containsChinese(longestLine) ? 100 : 150
      } else {
        offsets.x = -60
        offsets.y = containsChinese(longestLine) ? 130 : 150
      }
    }
  }

  return offsets
}

/** Calculate adaptive font size based on text length */
export function calculateFontSize(specifiedFontSize: number, longestLine: string): number {
  if (containsChinese(longestLine)) {
    if (containsEnglishLetter(longestLine) && longestLine.length > 3) {
      const englishLetterCount = countEnglishLetters(longestLine)
      return 278 / longestLine.length + englishLetterCount
    } else if (longestLine.length > 3) {
      if (longestLine.length > 4) {
        return 278 / longestLine.length
      }
      return 278 / longestLine.length - 12
    } else {
      return specifiedFontSize + 10 * (3 - longestLine.length) + 12
    }
  } else {
    return longestLine.length > 6
      ? 278 / longestLine.length + 10.5
      : longestLine.length > 4
        ? 278 / longestLine.length + 3
        : 278 / (longestLine.length + (longestLine.length > 2 ? 1 : 4 - longestLine.length))
  }
}

/** Parse markdown command string into array */
export function parseMarkdownCommands(markdownCommands: string): string[] {
  return markdownCommands.split(' ').filter(command => command.trim() !== '')
}

/** Get character name from user input (index or name) */
export function getCharacterName(character: string): string {
  const lowercaseCharacter = character.toLowerCase()

  if (/^\d+$/.test(lowercaseCharacter)) {
    const index = parseInt(lowercaseCharacter, 10)
    if (index >= 0 && index < characterNames.length - 3) {
      return characterNames[index + 3]
    }
  } else {
    const matchedCharacter = characterNames.find(
      (name) => name.toLowerCase() === lowercaseCharacter
    )
    if (matchedCharacter) {
      return matchedCharacter
    }
  }

  return '无效的角色序号或角色名！'
}

/** Get image path for a character */
export function getCharacterImagePath(characterName: string, pjskListDir: { [key: string]: string }): string {
  const imagePath = pjskListDir[`pjskListFor${characterName}Dir`]
  if (!imagePath) {
    return '找不到角色图像！'
  }
  return imagePath
}

/** Get image buffer for a character by name */
export function getCharacterImageBuffer(character: string, pjskListDir: { [key: string]: string }): string | Buffer {
  const characterName = getCharacterName(character)
  if (characterName === '无效的角色序号或角色名！') {
    return '无效的角色序号或角色名！'
  }
  const imagePath = getCharacterImagePath(characterName, pjskListDir)
  if (imagePath === '找不到角色图像！') {
    return '找不到角色图像！'
  }
  return readFileSync(imagePath)
}

/** Validate option value against range, send error message if out of range */
export async function checkOptions(session: any, options: any, key: string, range: Range, sendMessage: Function): Promise<boolean> {
  if (options[key] !== undefined && (options[key] < range.min || options[key] > range.max)) {
    await sendMessage(session, range.message, '随机绘制 自选绘制')
    return true
  }
  return false
}

/** Ensure a directory exists */
function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/** Release assets from plugin package to Koishi root data directory (zero-occupancy) */
export function releaseAssets(pluginDir: string, targetDir: string) {
  const srcAssets = path.join(pluginDir, '../assets')
  if (!existsSync(srcAssets)) return

  const subDirs = ['img', 'list', 'fonts']
  for (const sub of subDirs) {
    const src = path.join(srcAssets, sub)
    if (!existsSync(src)) continue
    const dst = path.join(targetDir, sub)
    ensureDir(dst)
    const files = readdirSync(src)
    for (const file of files) {
      const srcFile = path.join(src, file)
      const dstFile = path.join(dst, file)
      if (!existsSync(dstFile)) {
        copyFileSync(srcFile, dstFile)
      }
    }
  }

  // characters.json
  const srcJson = path.join(srcAssets, 'characters.json')
  const dstJson = path.join(targetDir, 'characters.json')
  if (existsSync(srcJson) && !existsSync(dstJson)) {
    copyFileSync(srcJson, dstJson)
  }
}

/** Ensure empty HTML file exists in tmp directory for Puppeteer base page */
export function ensureEmptyHtml(tmpDir: string): string {
  ensureDir(tmpDir)
  const htmlPath = path.join(tmpDir, 'empty-html-pjsk-pptr-for-qq-vincentzyu-fork.html')
  if (!existsSync(htmlPath)) {
    writeFileSync(htmlPath, '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>')
  }
  return htmlPath
}