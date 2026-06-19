import path from 'path'
import { readFileSync } from 'fs'
import { Context } from 'koishi'
import { Config } from './config'
import { releaseAssets, ensureEmptyHtml } from './utils'

/** Character names list (0-2 are special categories) */
export const characterNames = [
  'characterListAll',
  'characterListWithIndex',
  'characterListNoIndex',
  'Airi',
  'Akito',
  'An',
  'Emu',
  'Ena',
  'Haruka',
  'Honami',
  'Ichika',
  'KAITO',
  'Kanade',
  'Kohane',
  'Len',
  'Luka',
  'Mafuyu',
  'Meiko',
  'Miku',
  'Minori',
  'Mizuki',
  'Nene',
  'Rin',
  'Rui',
  'Saki',
  'Shiho',
  'Shizuku',
  'Touya',
  'Tsukasa',
]

export const baseCdn = 'https://pjsk.moe/sticker-maker/img/'

export let characters: any[] = []
export let pjskListDir: { [key: string]: string } = {}
/** Absolute path to the released assets directory (under ctx.baseDir/data/...) */
export let assetDir: string = ''
/** Absolute path to the temp directory (under ctx.baseDir/tmp/...) */
export let tempDir: string = ''
/** Full path to the empty HTML file used as Puppeteer base page */
export let filePath: string = ''

export function initConstants(ctx: Context, config: Config, rootDir: string) {
  // Resolve paths from Koishi root directory using config path arrays
  const resolvedAssetDir = path.join(ctx.baseDir, ...config.assetPath)
  const resolvedTempDir = path.join(ctx.baseDir, ...config.tempPath)

  assetDir = resolvedAssetDir
  tempDir = resolvedTempDir

  // Release assets from plugin package to Koishi root data directory (zero-occupancy)
  releaseAssets(rootDir, assetDir)

  // Ensure empty HTML file exists in tmp directory
  filePath = ensureEmptyHtml(resolvedTempDir).replace(/\\/g, '/')

  // Build character list image paths pointing to released assets
  pjskListDir = {}
  for (const name of characterNames) {
    pjskListDir[`pjskListFor${name}Dir`] = path.join(assetDir, 'list', `${name}.jpeg`)
  }

  // Load characters.json from released assets
  characters = JSON.parse(readFileSync(path.join(assetDir, 'characters.json'), 'utf8'))
}