import { h, noop } from 'koishi'
import { Config } from './config'
import { parseMarkdownCommands } from './utils'
import { characters } from './const'
import { Button } from './type'

/** Map shorthand label to full pjsk command */
function mapCommand(command: string): string {
  const map: Record<string, string> = {
    '全部': 'pjsk.列表.全部',
    '角色分类': 'pjsk.列表.角色分类',
    '指定角色': 'pjsk.列表.展开指定角色',
    '输入': '',
    '表情包列表': 'pjsk.列表',
    '随机绘制': 'pjsk.绘制',
    '自选绘制': 'pjsk.列表.角色分类',
    '修改文本': 'pjsk.调整.文本',
    '调整字体': 'pjsk.调整.字体',
    '调整行间距': 'pjsk.调整.行间距',
    '文本曲线': 'pjsk.调整.文本曲线',
    '调整位置': 'pjsk.调整.位置',
    '修改角色': 'pjsk.调整.角色',
    '字体变大': 'pjsk.调整.字体.大',
    '字体变小': 'pjsk.调整.字体.小',
    '行间距变大': 'pjsk.调整.行间距.大',
    '行间距变小': 'pjsk.调整.行间距.小',
    '开启曲线': 'pjsk.调整.文本曲线.开启',
    '关闭曲线': 'pjsk.调整.文本曲线.关闭',
    '文本上移': 'pjsk.调整.位置.上',
    '文本下移': 'pjsk.调整.位置.下',
    '文本左移': 'pjsk.调整.位置.左',
    '文本右移': 'pjsk.调整.位置.右',
    '随机角色': 'pjsk.调整.角色 -r',
    '输入角色序号或名称': '',
  }
  return map[command] ?? ''
}

const NO_ENTER_COMMANDS = ['指定角色', '输入', '修改角色', '修改文本', '输入角色序号或名称']

/** Create QQ keyboard buttons from markdown command labels */
export function createButtons(markdownCommands: string, config: Config): Button[] {
  const commands = parseMarkdownCommands(markdownCommands)
  return commands.map(command => {
    let dataValue = mapCommand(command)
    let array = [...NO_ENTER_COMMANDS]
    if (config.shouldWaitForUserInputBeforeSendingCommands) {
      array.push('随机绘制')
    }

    return {
      render_data: {
        label: command,
        visited_label: command,
        style: 1,
      },
      action: {
        type: 2,
        permission: { type: 2 },
        data: dataValue,
        enter: !array.includes(command),
      },
    }
  })
}

/** Create mqqapi inline links for native markdown */
export function createMqqapiLinks(markdownCommands: string, config: Config): string {
  const commands = parseMarkdownCommands(markdownCommands)
  if (commands.length === 0) return ''

  const links = commands.map(command => {
    let dataValue = mapCommand(command)
    if (!dataValue) return `[${command}]`
    let array = [...NO_ENTER_COMMANDS]
    if (config.shouldWaitForUserInputBeforeSendingCommands) {
      array.push('随机绘制')
    }
    const enter = !array.includes(command)
    return `[${command}](mqqapi://aio/inlinecmd?command=${encodeURIComponent(dataValue)}&enter=${enter}&reply=false)`
  })

  return `\n\n> 💡 快捷操作：\n` + links.map(link => `> ${link}`).join('\n')
}

/** Send native QQ markdown message with optional keyboard */
export async function sendQQNativeMarkdown(session: any, msgSeq: number, markdownContent: string, config: Config, keyboardPayload?: any) {
  const payload: any = {
    msg_type: 2 as const,
    msg_id: session.messageId,
    msg_seq: msgSeq,
    content: 'PJSK 呈现',
    markdown: { content: markdownContent },
  }
  if (keyboardPayload) {
    payload.keyboard = keyboardPayload
  }
  try {
    if (session.isDirect) {
      await session.qq.sendPrivateMessage(session.channelId, payload)
    } else {
      await session.qq.sendMessage(session.channelId, payload)
    }
  } catch (e: any) {
    const logger = session.bot?.logger || console
    if (config.enableDetailedDebugLog) {
      logger.error('MD发送失败:', e, e.response?.data)
    } else {
      logger.error('MD发送失败:', e.message || e)
    }
  }
}

/** Process user input after showing character list - prompts for emoji ID + text */
export async function processUserInput(
  session: any,
  config: Config,
  isQQOfficialRobotMarkdownTemplateEnabled: boolean,
  sendMessageFn: Function,
) {
  if (isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq' || config.shouldSendDrawingGuideText) {
    await sendMessageFn(session,
      '请选择您中意的表情 ID，\n并按以下格式进行绘制：\n> 表情包序号 文本内容\n例如：6 你好呀',
      '输入',
    )
  }
  const userInput = await session.prompt()
  if (!userInput) return

  const [number, ...words] = userInput.split(' ')
  const text = words.join(' ')

  const isValidCharacter = /^\d+$/.test(number) && parseInt(number, 10) >= 0 && parseInt(number, 10) < characters.length

  if (!isValidCharacter) return

  await session.execute(`pjsk.绘制 -n ${parseInt(number, 10)} ${text}`)
}

let sentMessages: string[] = []

/** Core send message function handling all QQ/non-QQ platforms */
export async function sendMessage(
  session: any,
  message: any,
  markdownCommands: string,
  config: Config,
  isQQOfficialRobotMarkdownTemplateEnabled: boolean,
  isTemplateMDEnabled: boolean,
  width?: number,
  height?: number,
) {
  markdownCommands = markdownCommands || ''
  width = width || 296
  height = height || 256
  const { bot, channelId } = session
  let messageId

  try {
    if (isQQOfficialRobotMarkdownTemplateEnabled && session.platform === 'qq') {
      session['seq'] = session['seq'] || 0
      const msgSeq = ++session['seq']

      if (message.attrs?.src) {
        ;[messageId] = await session.send(message)
      } else {
        if (config.shouldPrefixAtForMarkdownMessage) {
          message = `<@${session.userId}>\n${message}`
        }

        if (isTemplateMDEnabled) {
          message = message.replace(/\n/g, '\r')
          const buttons = createButtons(markdownCommands, config)
          const rows: { buttons: Button[] }[] = []
          let row = { buttons: [] as Button[] }
          buttons.forEach((button, index) => {
            row.buttons.push(button)
            if (row.buttons.length === 5 || index === buttons.length - 1 || row.buttons.length === config.numberOfMessageButtonsPerRow) {
              rows.push(row)
              row = { buttons: [] }
            }
          })

          const result = await session.qq.sendMessage(session.channelId, {
            msg_type: 2,
            msg_id: session.messageId,
            msg_seq: msgSeq,
            content: 'PJSK 结果汇报',
            markdown: {
              custom_template_id: config.customTemplateId,
              params: [
                {
                  key: config.key,
                  values: [`${message}`],
                },
              ],
            },
            keyboard: {
              content: {
                rows: rows.slice(0, 5),
              },
            },
          })
          messageId = result.id
        } else {
          let finalMarkdown = message
          if (config.enableQQInlineCmd && markdownCommands) {
            finalMarkdown += createMqqapiLinks(markdownCommands, config)
          }
          const payload = {
            msg_type: 2 as const,
            msg_id: session.messageId,
            msg_seq: msgSeq,
            content: 'PJSK 结果汇报',
            markdown: {
              content: finalMarkdown,
            },
          }
          let result
          if (session.isDirect) {
            result = await session.qq.sendPrivateMessage(session.channelId, payload)
          } else {
            result = await session.qq.sendMessage(session.channelId, payload)
          }
          messageId = result?.id || messageId
        }
      }
    } else {
      if (config.shouldMentionUserInMessage && !String(message).includes('img')) {
        message = h.at(session.userId) + ' ~ \n' + message
      }
      ;[messageId] = await session.send(message)
    }
  } catch (err: any) {
    const logger = session.bot?.logger || console
    if (config.enableDetailedDebugLog) {
      logger.error('发送消息失败:', err)
      if (err.response && err.response.data) {
        logger.error('API 响应的详细报错负载信息:', JSON.stringify(err.response.data, null, 2))
      }
    } else {
      logger.error('发送消息失败:', err.message || err)
    }
    return
  }

  if (config.retractDelay === 0) return
  sentMessages.push(messageId)

  if (sentMessages.length > 1) {
    const oldestMessageId = sentMessages.shift()
    setTimeout(async () => {
      await bot!.deleteMessage(channelId, oldestMessageId)
    }, config.retractDelay * 1000)
  }
}