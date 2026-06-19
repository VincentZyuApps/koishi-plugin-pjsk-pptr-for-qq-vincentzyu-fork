import { Schema } from 'koishi'

/**
 * 📋 插件配置项接口
 */
export interface Config {
  // ==== 🎨 绘制设置 ====
  isTextSizeAdaptationEnabled: boolean

  // ==== 💬 消息与引导设置 ====
  shouldSendDrawingGuideText: boolean
  shouldSendSuccessMessageAfterDrawingEmoji: boolean
  shouldMentionUserInMessage: boolean
  retractDelay: number

  // ==== 🤖 QQ 官方 Bot 平台设置 ====
  isEnableQQOfficialRobotMarkdownTemplate: boolean
  customTemplateId: string
  key: string
  enableQQNativeMarkdown: boolean
  enableQQInlineCmd: boolean
  numberOfMessageButtonsPerRow: number
  shouldPrefixAtForMarkdownMessage: boolean
  shouldWaitForUserInputBeforeSendingCommands: boolean

  // ==== 📂 存储路径设置 ====
  assetPath: string[]
  tempPath: string[]

  // ==== 🐛 Debug-调试设置 ====
  enableDetailedDebugLog: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  // ==== 🎨 绘制设置 ====
  Schema.object({
    isTextSizeAdaptationEnabled: Schema.boolean().default(true)
      .description('🎨 是否启用文本大小自适应，关闭后使用默认字体大小。'),
  }).description('==== 🎨 绘制设置 ===='),

  // ==== 💬 消息与引导设置 ====
  Schema.object({
    shouldSendDrawingGuideText: Schema.boolean().default(true)
      .description('💬（QQ 官方机器人自动开启）是否发送提示文本信息，当开启后，将会发送引导用户绘制表情包的提示文本信息。'),
    shouldSendSuccessMessageAfterDrawingEmoji: Schema.boolean().default(true)
      .description('🎉（QQ 官方机器人自动开启）是否发送绘制表情包成功的提示信息，即 🎉 表情包绘制完成！。'),
    shouldMentionUserInMessage: Schema.boolean().default(false)
      .description('👤（非 QQ 官方机器人）是否在消息中 @ 用户。'),
    retractDelay: Schema.number().min(0).default(0)
      .description('⏳ 自动撤回等待的时间，单位是秒。值为 0 时不启用自动撤回功能。'),
  }).description('==== 💬 消息与引导设置 ===='),

  // ==== 🤖 QQ 官方 Bot 平台设置 ====
  Schema.object({
    isEnableQQOfficialRobotMarkdownTemplate: Schema.boolean().default(false)
      .description('📋 是否启用 QQ 官方机器人的 Markdown 模板，带消息按钮。'),
    enableQQNativeMarkdown: Schema.boolean().default(false)
      .description('📝 是否启用原生 Markdown。启用的前提下，未配置官方模板时会自动使用原生 Markdown 排版。'),
    enableQQInlineCmd: Schema.boolean().default(false)
      .description('🔗 是否在开启原生 Markdown 时启用 mqqapi 快捷点击指令菜单。'),
  }).description('==== 🤖 QQ 官方 Bot 平台设置 ===='),

  // ==== 📋 QQ 官方机器人 Markdown 模板设置（条件） ====
  Schema.union([
    Schema.object({
      isEnableQQOfficialRobotMarkdownTemplate: Schema.const(true).required(),
      customTemplateId: Schema.string().default('')
        .description('🆔 自定义模板 ID。'),
      key: Schema.string().default('')
        .description('🔑 文本内容中特定插值的 key，用于存放文本。如果你的插值为 {{.info}}，那么请在这里填 info。'),
      numberOfMessageButtonsPerRow: Schema.number().min(3).max(5).default(3)
        .description('🔢 每行消息按钮的数量。'),
      shouldPrefixAtForMarkdownMessage: Schema.boolean().default(false)
        .description('💬 是否在 Markdown 消息的文本前加上一行 @用户。'),
      shouldWaitForUserInputBeforeSendingCommands: Schema.boolean().default(false)
        .description('⏸️ 是否在点击 "随机绘制" 按钮后等待用户输入。'),
    }),
    Schema.object({}),
  ]),

  // ==== 📂 存储路径设置 ====
  Schema.object({
    assetPath: Schema.array(String).role('table').default(['data', 'pjsk-pptr-for-qq-vincentzyu-fork'])
      .description('📂 资源文件存储路径（相对于 Koishi 根目录）。首次运行时会从插件包中复制字体、图片等资源到此目录。'),
    tempPath: Schema.array(String).role('table').default(['tmp'])
      .description('📂 临时文件存储路径（相对于 Koishi 根目录）。用于存放运行时生成的临时文件，如 Puppeteer 基础页面。'),
  }).description('==== 📂 存储路径设置 ===='),

  // ==== 🐛 Debug-调试设置 ====
  Schema.object({
    enableDetailedDebugLog: Schema.boolean().default(false)
      .description('🔍 是否在发送失败时将详细且完整的 API 报错负载记录输出到控制台。'),
  }).description('==== 🐛 Debug-调试设置 ===='),
]) as any