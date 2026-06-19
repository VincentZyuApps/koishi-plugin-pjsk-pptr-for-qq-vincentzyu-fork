import {Context, Logger, Schema, h, noop} from 'koishi'
import {} from '@koishijs/plugin-help'
import {} from 'koishi-plugin-puppeteer'
import {} from '@koishijs/assets'
import path from 'path'

import { Config } from './config'
import { usage } from './usage'
import { PJSK, Range } from './type'
import {
  characterNames, characters, pjskListDir, assetDir, filePath, baseCdn,
  initConstants,
} from './const'
import { draw, drawList, drawList2 } from './image'
import {
  getImgDimensions, findLongestLine, calculateOffsets, calculateFontSize,
  checkOptions, getCharacterName, getCharacterImageBuffer,
} from './utils'
import {
  sendQQNativeMarkdown, sendMessage, processUserInput, createButtons, createMqqapiLinks,
} from './qq'

export const name = 'pjsk-pptr'
export const inject = {
  required: ['puppeteer', 'database'],
  optional: ['assets'],
}
export { usage }
export { Config }

const logger = new Logger('PJSK')

export function apply(ctx: Context, config: Config) {
  // Initialize constants from assets directory (zero-occupancy mode)
  initConstants(ctx, config, __dirname)

  // Database model
  ctx.model.extend('pjsk', {
    id: 'unsigned',
    userId: 'string',
    username: 'string',
    fontSize: 'unsigned',
    curve: 'boolean',
    characterId: 'unsigned',
    text: 'string',
    x: 'unsigned',
    y: 'unsigned',
    spaceSize: 'unsigned',
    rotate: 'integer',
  }, {primary: 'id', autoInc: true})

  // Convenience flags
  const isTemplateMDEnabled = config.isEnableQQOfficialRobotMarkdownTemplate && config.key !== '' && config.customTemplateId !== ''
  const isNativeMDEnabled = config.enableQQNativeMarkdown
  const isQQOfficialRobotMarkdownTemplateEnabled = isTemplateMDEnabled || isNativeMDEnabled

  // ── pjsk (root help) ──
  ctx.command('pjsk', '初音未来表情包生成帮助')
    .example('pjsk')
    .action(async ({session}) => {
      if (session.platform === 'qq' && (config.enableQQNativeMarkdown || config.isEnableQQOfficialRobotMarkdownTemplate)) {
        session['seq'] = session['seq'] || 0
        const botName = session.bot?.user?.name || session.bot?.user?.nick || '机器人'
        const md = `PJSK表情制作使用方法:\n> 例: @${botName} /pjsk [角色]+[编号]+[内容]\n\n> 🕹️ 请点击下方按钮进入功能引导：`
        const keyboard = {
          content: {
            rows: [{
              buttons: [
                { id: '1', render_data: { label: '😜 📝 选择角色与编号', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.角色列表', enter: true } },
              ],
            }],
          },
        }
        await sendQQNativeMarkdown(session, ++session['seq'], md, config, keyboard)
        return
      }
      await session.execute('pjsk -h')
    })

  // ── pjsk.角色列表 ──
  ctx.command('pjsk.角色列表', 'PJSK 角色选择菜单')
    .example('pjsk.角色列表')
    .action(async ({session}) => {
      if (!(session.platform === 'qq' && (config.enableQQNativeMarkdown || config.isEnableQQOfficialRobotMarkdownTemplate))) {
        return await session.send('该排版目前仅原生 QQ 平台支持。')
      }
      const uniqueCharacters: { character: string; img: string }[] = []
      const seenChara = new Set<string>()
      for (const c of characters) {
        if (!seenChara.has(c.character)) {
          seenChara.add(c.character)
          uniqueCharacters.push({ character: c.character, img: c.img })
        }
      }

      let md = 'PJSK角色选择菜单\n点击 [+] 并发送进行下一步~\n\n'
      let count = 0
      for (const u of uniqueCharacters) {
        const url = `${baseCdn}${u.img}`
        const cmd = `/pjsk.子图列表 ${u.character}`
        const mqqapi = `mqqapi://aio/inlinecmd?command=${encodeURIComponent(cmd)}&reply=false&enter=true`
        const localImgPath = path.join(assetDir, 'img', u.img)
        const { w, h } = getImgDimensions(localImgPath, 35)
        md += `![${u.character} #${w}px #${h}px](${url}) [[+]](${mqqapi})`
        count++
        if (count % 4 === 0) md += '\n\n'; else md += ' '
      }
      session['seq'] = session['seq'] || 0
      await sendQQNativeMarkdown(session, ++session['seq'], md, config)
    })

  // ── pjsk.子图列表 ──
  ctx.command('pjsk.子图列表 <character:string>', 'PJSK 子图选择菜单')
    .example('pjsk.子图列表 Airi')
    .action(async ({session}, character) => {
      if (!(session.platform === 'qq' && (config.enableQQNativeMarkdown || config.isEnableQQOfficialRobotMarkdownTemplate))) return
      if (!character) return

      const lowercaseCharacter = character.toLowerCase()
      const filteredCharacters = characters.filter(c => c.character.toLowerCase() === lowercaseCharacter)

      if (filteredCharacters.length === 0) {
        session['seq'] = session['seq'] || 0
        await sendQQNativeMarkdown(session, ++session['seq'], '找不到角色图像！', config)
        return
      }

      let md = `${character}子图选择菜单\n点击 [+] 并输入内容即可生成~\n\n`
      let count = 0
      for (const c of filteredCharacters) {
        const url = `${baseCdn}${c.img}`
        const cmd = `/pjsk.绘制 -n ${characters.indexOf(c)} `
        const mqqapi = `mqqapi://aio/inlinecmd?command=${encodeURIComponent(cmd)}&reply=false&enter=false`
        const localImgPath = path.join(assetDir, 'img', c.img)
        const { w, h } = getImgDimensions(localImgPath, 36)
        md += `![${c.name} #${w}px #${h}px](${url}) [[+]](${mqqapi})`
        count++
        if (count % 4 === 0) md += '\n\n'; else md += ' '
      }
      session['seq'] = session['seq'] || 0
      await sendQQNativeMarkdown(session, ++session['seq'], md, config)
    })

  // ── pjsk.列表.角色分类 ──
  ctx.command('pjsk.列表.角色分类', '角色分类表情列表')
    .action(async ({session}) => {
      const buffer = require('fs').readFileSync(pjskListDir['pjskListForcharacterListWithIndexDir'])
      await sendMessage(session, h.image(buffer, 'image/jpeg'), '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled, 1570, 1637)
      if (isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq' || config.shouldSendDrawingGuideText) {
        await sendMessage(session, '查看指定角色的表情，请输入：\n> 角色序号，例如：10\n> 角色名，例如：Emu', '输入角色序号或名称', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const userInput = await session.prompt()
      if (!userInput) return isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq' || config.shouldSendDrawingGuideText
        ? await sendMessage(session, '输入无效或超时！', '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
        : noop()
      const character = getCharacterName(userInput)
      if (character === '无效的角色序号或角色名！' || character === '找不到角色图像！') {
        return isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq' || config.shouldSendDrawingGuideText
          ? await sendMessage(session, '无效的角色序号或角色名！', '表情包列表 角色分类', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
          : noop()
      } else {
        await session.execute(`pjsk.列表.展开指定角色 ${character}`)
      }
    })

  // ── pjsk.列表.展开指定角色 ──
  ctx.command('pjsk.列表.展开指定角色 <character:string>', '展开指定角色表情列表')
    .action(async ({session}, character) => {
      if (!character) {
        return await sendMessage(session, '请输入有效的角色序号或角色名！', '表情包列表 角色分类', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const imageBuffer = getCharacterImageBuffer(character, pjskListDir)
      if (imageBuffer === '无效的角色序号或角色名！' || imageBuffer === '找不到角色图像！') {
        return await sendMessage(session, imageBuffer, '表情包列表 指定角色', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      await sendMessage(session, h.image(imageBuffer as Buffer, 'image/jpeg'), '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled, 1570, 1096)
      await processUserInput(session, config, isQQOfficialRobotMarkdownTemplateEnabled, (s: any, msg: any, cmd: string) =>
        sendMessage(s, msg, cmd, config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled))
    })

  // ── pjsk.调整 ──
  ctx.command('pjsk.调整', '调整指令引导')
    .option('url', '-u [url:string] 附带服务器临时链接', {hidden: true})
    .action(async ({session, options}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }

      if (session.platform === 'qq' && (config.enableQQNativeMarkdown || config.isEnableQQOfficialRobotMarkdownTemplate)) {
        const lastRecord = userRecord[0]
        const characterName = characters[lastRecord.characterId]?.character || `未知(${lastRecord.characterId})`
        const textStr = lastRecord.text.substring(0, 10).replace(/\r\n|\n/g, ' ') + (lastRecord.text.length > 10 ? '...' : '')

        let md = `❖ **PJSK 表情控制台**\n`
        if (options.url) {
          md += `![image #296px #256px](${options.url})\n`
        }
        md += `> 角色：${characterName}\n`
        md += `> 文本：${textStr}\n`

        const keyboard = {
          content: {
            rows: [
              {
                buttons: [
                  { id: '11', render_data: { label: '修改文字', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.文本 ', enter: false } },
                  { id: '12', render_data: { label: '切换角色', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.角色 ', enter: false } },
                ],
              },
              {
                buttons: [
                  { id: '21', render_data: { label: '上移', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.位置.上', enter: true } },
                  { id: '22', render_data: { label: '下移', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.位置.下', enter: true } },
                  { id: '23', render_data: { label: '左移', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.位置.左', enter: true } },
                  { id: '24', render_data: { label: '右移', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.位置.右', enter: true } },
                ],
              },
              {
                buttons: [
                  { id: '31', render_data: { label: '大字', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.字体.大', enter: true } },
                  { id: '32', render_data: { label: '小字', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.字体.小', enter: true } },
                  { id: '33', render_data: { label: '加行距', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.行间距.大', enter: true } },
                  { id: '34', render_data: { label: '减行距', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.行间距.小', enter: true } },
                ],
              },
              {
                buttons: [
                  { id: '41', render_data: { label: '开启弯曲', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.文本曲线.开启', enter: true } },
                  { id: '42', render_data: { label: '关闭弯曲', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整.文本曲线.关闭', enter: true } },
                ],
              },
            ],
          },
        }

        session['seq'] = session['seq'] || 0
        return await sendQQNativeMarkdown(session, ++session['seq'], md, config, keyboard)
      }

      return await sendMessage(session, `请使用以下指令调整表情包：
> pjsk.调整.文本 [文本内容] - 修改文本
> pjsk.调整.字体.大 - 字体变大
> pjsk.调整.字体.小 - 字体变小
> pjsk.调整.行间距.大 - 行间距变大
> pjsk.调整.行间距.小 - 行间距变小
> pjsk.调整.文本曲线.开启 - 开启文本曲线
> pjsk.调整.文本曲线.关闭 - 关闭文本曲线
> pjsk.调整.位置.上 - 文本上移
> pjsk.调整.位置.下 - 文本下移
> pjsk.调整.位置.左 - 文本左移
> pjsk.调整.位置.右 - 文本右移
> pjsk.调整.角色 [角色ID] - 修改表情包角色
`, '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
    })

  // ── pjsk.调整.文本 ──
  ctx.command('pjsk.调整.文本 <textContent:text>', '修改文本内容')
    .action(async ({session}, textContent) => {
      if (!textContent) {
        return await sendMessage(session, '请输入有效的文本内容！', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      await ctx.database.set('pjsk', {userId: session.userId}, {text: textContent})
      const { fontSize, curve, characterId, x, y, spaceSize, rotate } = userRecord[0]
      await session.execute(`pjsk.绘制 -d -n ${characterId}${curve ? ' -c' : ''} ${textContent}`)
    })

  // ── pjsk.调整.字体 ──
  ctx.command('pjsk.调整.字体', '调整字体大小指令引导')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      if (isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq') {
        return await sendMessage(session, '您可以对字体进行的操作有：\n1. 字体变大\n2. 字体变小', '字体变大 字体变小', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      return await sendMessage(session, '请使用以下指令调整字体大小：\n> pjsk.调整.字体.大 - 字体变大\n> pjsk.调整.字体.小 - 字体变小', '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
    })

  // ── pjsk.调整.字体.大 ──
  ctx.command('pjsk.调整.字体.大', '')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { fontSize, text, curve, characterId, x, y, spaceSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {fontSize: fontSize + 5})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize + 5} -x ${x} -y ${y} -l ${spaceSize}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.字体.小 ──
  ctx.command('pjsk.调整.字体.小', '')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { fontSize, text, curve, characterId, x, y, spaceSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {fontSize: fontSize - 5})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize - 5} -x ${x} -y ${y} -l ${spaceSize}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.行间距 ──
  ctx.command('pjsk.调整.行间距', '调整行间距指令引导')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      if (isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq') {
        return await sendMessage(session, '您可以对行间距进行的操作有：\n1. 行间距变大\n2. 行间距变小', '行间距变大 行间距变小', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      return await sendMessage(session, '请使用以下指令调整行间距：\n> pjsk.调整.行间距.大 - 行间距变大\n> pjsk.调整.行间距.小 - 行间距变小', '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
    })

  // ── pjsk.调整.行间距.大 ──
  ctx.command('pjsk.调整.行间距.大', '')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { spaceSize, text, curve, characterId, x, y, fontSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {spaceSize: spaceSize + 5})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize} -x ${x} -y ${y} -l ${spaceSize + 5}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.行间距.小 ──
  ctx.command('pjsk.调整.行间距.小', '')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { spaceSize, text, curve, characterId, x, y, fontSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {spaceSize: spaceSize - 5})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize} -x ${x} -y ${y} -l ${spaceSize - 5}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.文本曲线 ──
  ctx.command('pjsk.调整.文本曲线', '调整文本曲线指令引导')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      if (isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq') {
        return await sendMessage(session, '您可以对文本曲线进行的操作有：\n1. 开启文本曲线\n2. 关闭文本曲线', '开启文本曲线 关闭文本曲线', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      return await sendMessage(session, '请使用以下指令调整文本曲线：\n> pjsk.调整.文本曲线.开启 - 开启文本曲线\n> pjsk.调整.文本曲线.关闭 - 关闭文本曲线', '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
    })

  // ── pjsk.调整.文本曲线.开启 ──
  ctx.command('pjsk.调整.文本曲线.开启', '开启文本曲线')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      await ctx.database.set('pjsk', {userId: session.userId}, {curve: true})
      const { text, fontSize, characterId, x, y, spaceSize, rotate } = userRecord[0]
      await session.execute(`pjsk.绘制 -d -n ${characterId} -c ${text}`)
    })

  // ── pjsk.调整.文本曲线.关闭 ──
  ctx.command('pjsk.调整.文本曲线.关闭', '关闭文本曲线')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      await ctx.database.set('pjsk', {userId: session.userId}, {curve: false})
      const { text, fontSize, characterId, x, y, spaceSize, rotate } = userRecord[0]
      await session.execute(`pjsk.绘制 -d -n ${characterId} ${text}`)
    })

  // ── pjsk.调整.位置 ──
  ctx.command('pjsk.调整.位置', '调整文本位置指令引导')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      if (isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq') {
        return await sendMessage(session, '您可以对文本进行的操作有：\n1. 文本上移\n2. 文本下移\n3. 文本左移\n4. 文本右移', '文本上移 文本下移 文本左移 文本右移', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      return await sendMessage(session, '请使用以下指令调整文本位置：\n> pjsk.调整.位置.上 - 文本上移\n> pjsk.调整.位置.下 - 文本下移\n> pjsk.调整.位置.左 - 文本左移\n> pjsk.调整.位置.右 - 文本右移', '', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
    })

  // ── pjsk.调整.位置.上 ──
  ctx.command('pjsk.调整.位置.上', '文本上移')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { y, text, fontSize, curve, characterId, x, spaceSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {y: y - 20})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize} -x ${x} -y ${y - 20} -l ${spaceSize}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.位置.下 ──
  ctx.command('pjsk.调整.位置.下', '文本下移')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { y, text, fontSize, curve, characterId, x, spaceSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {y: y + 20})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize} -x ${x} -y ${y + 20} -l ${spaceSize}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.位置.左 ──
  ctx.command('pjsk.调整.位置.左', '文本左移')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { x, text, fontSize, curve, characterId, y, spaceSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {x: x - 20})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize} -x ${x - 20} -y ${y} -l ${spaceSize}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.位置.右 ──
  ctx.command('pjsk.调整.位置.右', '文本右移')
    .action(async ({session}) => {
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const { x, text, fontSize, curve, characterId, y, spaceSize, rotate } = userRecord[0]
      await ctx.database.set('pjsk', {userId: session.userId}, {x: x + 20})
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize} -x ${x + 20} -y ${y} -l ${spaceSize}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.调整.角色 ──
  ctx.command('pjsk.调整.角色 <characterId:number>', '修改表情包角色')
    .option('random', '-r 随机选择角色', {fallback: false})
    .action(async ({session, options}, characterId) => {
      if (options.random) {
        characterId = Math.floor(Math.random() * characters.length)
      }
      if (!characterId) {
        return await sendMessage(session, '请输入有效的表情 ID！', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      if (characterId < 0 || characterId >= characters.length) {
        return await sendMessage(session, `抱歉，您输入的表情 ID 无效，请输入范围在 0 到 ${characters.length - 1} 之间的有效表情 ID。`, '修改角色 随机角色', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      const userRecord = await ctx.database.get('pjsk', {userId: session.userId})
      if (userRecord.length === 0) {
        return await sendMessage(session, '抱歉，您尚未绘制过表情包。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
      }
      await ctx.database.set('pjsk', {userId: session.userId}, {characterId})
      const { text, fontSize, curve, x, y, spaceSize, rotate } = userRecord[0]
      await session.execute(`pjsk.绘制 -d --daf -n ${characterId} -s ${fontSize} -x ${x} -y ${y} -l ${spaceSize}${curve ? ' -c' : ''} ${text}`)
    })

  // ── pjsk.绘制 (main draw command) ──
  ctx.command('pjsk.绘制 [inputText:text]', '绘制表情包')
    .usage('pjsk.绘制 <text>\npjsk.绘制 -n <id> <text>\npjsk.绘制 -n <id> -x <x> -y <y> <text>')
    .example('pjsk.绘制 今天的烤肉真香啊')
    .example('pjsk.绘制 -n 12 为什么要熬夜呢')
    .example('pjsk.绘制 -n 18 -y 10 -c 真的绝望了')
    .option('number', '-n [number:number] 表情包ID', {fallback: undefined})
    .option('positionY', '-y [positionY:number] 文本的垂直位置', {fallback: undefined})
    .option('positionX', '-x [positionX:number] 文本的水平位置', {fallback: undefined})
    .option('rotate', '-r [rotate:number] 文本的旋转角度', {fallback: undefined})
    .option('fontSize', '-s [fontSize:number] 文本字体的大小', {fallback: undefined})
    .option('spaceSize', '-l [spaceSize:number] 文本上下行间距', {fallback: 18})
    .option('curve', '-c 是否启用文本曲线', {fallback: false})
    .option('disableAdaptiveFunctionality', '--daf 关闭自适应功能', {hidden: true, fallback: false})
    .option('showDashboard', '-d 显示调整面板', {hidden: true, fallback: false})
    .action(async ({session, options}, inputText) => {
      let character: any
      let characterId: number

      if (options.number !== undefined) {
        const isValidCharacter = options.number >= 0 && options.number < characters.length
        if (!isValidCharacter) {
          return await sendMessage(session, '抱歉，您输入的表情 ID 无效，请输入范围在 0 到 358 之间的有效表情 ID。', '随机绘制 自选绘制', config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled)
        }
        character = characters[options.number]
        characterId = options.number
      } else {
        const randomIndex = Math.floor(Math.random() * characters.length)
        character = characters[randomIndex]
        characterId = randomIndex
      }

      let { text, x, y, r: rotate, s: fontSize } = character.defaultText
      if (inputText) {
        text = inputText.replace(/\/+/g, '\\n').replace(/\n/g, '\\n')
      }
      const { color, img } = character
      const imgPath = 'file://' + assetDir.replaceAll('\\', '/') + `/img/${img}`

      const curve = options.curve || false
      let spaceSize = options.spaceSize || 18
      let specifiedX = options.positionX !== undefined ? options.positionX : x
      let specifiedY = options.positionY !== undefined ? options.positionY : y + 12
      const specifiedRotate = options.rotate !== undefined ? options.rotate : rotate
      let specifiedFontSize = options.fontSize !== undefined ? options.fontSize : fontSize

      if (config.isTextSizeAdaptationEnabled && !options.disableAdaptiveFunctionality) {
        const longestLine = findLongestLine(text)
        const offsets = calculateOffsets(longestLine, options)
        specifiedX += offsets.x
        specifiedY += offsets.y
        specifiedFontSize = calculateFontSize(specifiedFontSize, longestLine)
        spaceSize += specifiedFontSize / 2 + 10
      }

      const ranges: { [key: string]: Range } = {
        positionY: { min: 0, max: 256, message: '抱歉，文本的垂直位置必须在 0 到 256 之间。' },
        positionX: { min: 0, max: 296, message: '抱歉，文本的水平位置必须在 0 到 296 之间。' },
        rotate: { min: -10, max: 10, message: '抱歉，文本的旋转角度必须在 -10 到 10 之间。' },
        fontSize: { min: 10, max: 100, message: '抱歉，文本的字体大小必须在 10 到 100 之间。' },
        spaceSize: { min: 18, max: 100, message: '抱歉，文本的上下行间距必须在 18 到 100 之间。' },
      }

      if (!options.curve) {
        for (const key in ranges) {
          if (await checkOptions(session, options, key, ranges[key],
            (s: any, msg: string, cmd: string) => sendMessage(s, msg, cmd, config, isQQOfficialRobotMarkdownTemplateEnabled, isTemplateMDEnabled))) return
        }
      }

      const angle = (Math.PI * text.length) / 7

      // Save/update user record
      const userRecord = await ctx.database.get('pjsk', { userId: session.userId })
      if (userRecord.length === 0) {
        await ctx.database.create('pjsk', {
          userId: session.userId, username: session.username,
          text, fontSize: specifiedFontSize, curve, characterId,
          x: specifiedX, y: specifiedY, spaceSize, rotate: specifiedRotate,
        })
      } else {
        await ctx.database.set('pjsk', { userId: session.userId }, {
          userId: session.userId, username: session.username,
          text, fontSize: specifiedFontSize, curve, characterId,
          x: specifiedX, y: specifiedY, spaceSize, rotate: specifiedRotate,
        })
      }

      const buffer = await draw(ctx, text, imgPath, specifiedX, specifiedY, specifiedRotate, specifiedFontSize, color, curve, spaceSize, angle)

      let assetUrl = ''
      if (session.platform === 'qq' && (config.enableQQNativeMarkdown || config.isEnableQQOfficialRobotMarkdownTemplate) && ctx.assets) {
        try {
          const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
          assetUrl = await ctx.assets.upload(dataUrl, 'pjsk.png')
        } catch (e) {
          logger.warn('Failed to upload image to assets service:', e)
        }
      }

      if (!assetUrl) {
        await session.send(h.image(buffer, 'image/png'))
      }

      if (session.platform === 'qq' && (config.enableQQNativeMarkdown || config.isEnableQQOfficialRobotMarkdownTemplate)) {
        session['seq'] = session['seq'] || 0
        const msgSeq = ++session['seq']

        if (options.showDashboard) {
          await session.execute('pjsk.调整' + (assetUrl ? ` -u "${assetUrl}"` : ''))
          return
        }

        const trailingMd = assetUrl
          ? `![image #296px #256px](${assetUrl})\n> 💡 绘制完成！接下来...`
          : '> 💡 绘制完成！接下来...'
        const keyboard = {
          content: {
            rows: [{
              buttons: [
                { id: '1', render_data: { label: '更改内容', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.调整', enter: true } },
                { id: '2', render_data: { label: '随机绘制', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk.绘制', enter: true } },
                { id: '3', render_data: { label: '返回菜单', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '/pjsk', enter: true } },
              ],
            }],
          },
        }
        await sendQQNativeMarkdown(session, msgSeq, trailingMd, config, keyboard)
        return
      } else {
        if (config.shouldSendSuccessMessageAfterDrawingEmoji) {
          return await session.send('🎉 表情包绘制完成！\n\n🔍 输入"pjsk.调整"获取调整指令\n或直接输入"pjsk.角色列表"开始新的绘制\n\n✨ 期待您的下一个创作！')
        }
      }
    })
}