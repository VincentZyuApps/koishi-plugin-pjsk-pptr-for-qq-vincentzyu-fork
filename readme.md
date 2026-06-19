![koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork](https://socialify.git.ci/VincentZyuApps/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork/image?custom_description=&description=1&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png%3F_%3D20230331182243&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

# koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork

[![npm](https://img.shields.io/npm/v/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/pjsk-pptr-for-qq-vincentzyu-fork)

[![Koishi Forum](https://img.shields.io/badge/Koishi论坛-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/12076/3)
[![QQ群](https://img.shields.io/badge/QQ群-259248174-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/4vjto4V7Di)

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入新QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

🎨 Koishi 的 pjsk(Project SEKAI 世界计划) 表情包绘制插件，额外支持 🤖 QQ 官 Bot 平台的原生 MD 和 mqqapi ✨

## 安装

```bash
yarn add koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork
# or
npm install koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork
```

或在 Koishi 控制台的插件市场中搜索`pjsk-pptr-for-qq-vincentzyu-fork`安装。

## 前置依赖

- `puppeteer` - 浏览器渲染服务（必需）
- `database` - 数据库服务（必需，用于保存用户的绘制记录）
- `assets` - 资源服务（可选，QQ 官方 Bot Markdown 模式下用于图片上传）

## 指令列表

### `pjsk` - 主帮助

查看表情包生成帮助，QQ 平台会展示带按钮的菜单。

### `pjsk.绘制 [文本]` - 绘制表情包

核心指令，将自定义文本渲染到表情包中。使用 `/` 或换行符分隔多行文本。

**选项：**

| 选项 | 说明 |
|------|------|
| `-n <number>` | 表情包 ID（0-358），不指定则随机 |
| `-y <number>` | 文本垂直位置（0-256） |
| `-x <number>` | 文本水平位置（0-296） |
| `-r <number>` | 旋转角度（-10 ~ 10） |
| `-s <number>` | 字体大小（10-100，自适应模式不生效） |
| `-l <number>` | 行间距（18-100） |
| `-c` | 启用文本曲线 |
| `--daf` | 关闭字体大小自适应 |

**示例：**

```
pjsk.绘制 今天的烤肉真香啊
pjsk.绘制 -n 12 为什么要熬夜呢
pjsk.绘制 -n 18 -y 10 -c 真的绝望了
```

### `pjsk.角色列表` - 角色选择菜单

展示所有可选角色（QQ 原生 Markdown 模式专用）。

### `pjsk.子图列表 <角色名>` - 子图菜单

展示指定角色的所有表情子图。

### `pjsk.列表.角色分类` - 角色分类引导

交互式引导，通过对话选择角色和表情 ID。

### `pjsk.调整` - 调整面板

对已绘制的表情包进行二次调整。

| 子指令 | 说明 |
|--------|------|
| `pjsk.调整.文本 <内容>` | 修改文本 |
| `pjsk.调整.字体.大` / `.小` | 字体 ±5 |
| `pjsk.调整.行间距.大` / `.小` | 行间距 ±5 |
| `pjsk.调整.文本曲线.开启` / `.关闭` | 切换曲线 |
| `pjsk.调整.位置.上/下/左/右` | 移动文本（±20px） |
| `pjsk.调整.角色 <ID>` | 切换角色 |
| `pjsk.调整.角色 -r` | 随机角色 |

## 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `isTextSizeAdaptationEnabled` | true | 文本大小自适应 |
| `shouldSendDrawingGuideText` | true | 发送绘制引导文本 |
| `shouldSendSuccessMessageAfterDrawingEmoji` | true | 绘制成功提示 |
| `retractDelay` | 0 | 自动撤回延迟（秒） |
| `shouldMentionUserInMessage` | false | 非 QQ 平台 @ 用户 |
| `isEnableQQOfficialRobotMarkdownTemplate` | false | 启用 QQ 官方模板 |
| `customTemplateId` | '' | 模板 ID |
| `key` | '' | 模板插值 key |
| `enableQQNativeMarkdown` | false | 启用原生 Markdown |
| `enableQQInlineCmd` | false | 启用 mqqapi 快捷指令 |
| `enableDetailedDebugLog` | false | 详细 API 报错日志 |

## 项目结构

```
src/
├── index.ts   # 插件入口，指令注册
├── config.ts  # Config 接口与 Schema
├── const.ts   # 常量与初始化
├── type.ts    # 类型定义
├── usage.ts   # 使用说明文本
├── utils.ts   # 工具函数
├── image.ts   # Puppeteer Canvas 渲染
└── qq.ts      # QQ 平台消息发送
```
