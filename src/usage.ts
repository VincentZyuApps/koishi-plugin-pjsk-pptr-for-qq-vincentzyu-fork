import pkg from '../package.json'

export const usage = `
<h1>🎮 Koishi 插件：pjsk-pptr-for-qq - Project SEKAI 表情包生成器</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork?style=flat-square" alt="npm version">
  </a>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-pjsk-pptr-for-qq-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <a href="https://forum.koishi.xyz/t/topic/12076/3" target="_blank">
    <img src="https://img.shields.io/badge/Koishi论坛-12076-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Forum">
  </a>
  <a href="https://qm.qq.com/q/4vjto4V7Di" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-259248174-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 请加群 <b>956758505</b>（上游作者群，已与我无关）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<h2>🎨 功能简介</h2>
<p>基于 Puppeteer 渲染 Canvas 生成 PJSK 表情包，支持 QQ 官方 Bot 原生 Markdown 和 mqqapi 快捷指令。</p>

<h2>🚀 快速开始</h2>
<ul>
  <li><code>pjsk.绘制 &lt;文本&gt;</code> — 随机生成表情包</li>
  <li><code>pjsk.绘制 -n &lt;ID&gt; &lt;文本&gt;</code> — 指定表情 ID</li>
  <li><code>pjsk.列表.角色分类</code> — 角色分类引导</li>
  <li><code>pjsk.调整</code> — 二次调整已绘制的表情</li>
</ul>

<h2>📦 前置依赖</h2>
<ul>
  <li><code>puppeteer</code> — 浏览器渲染服务</li>
  <li><code>database</code> — 数据库服务</li>
  <li><code>assets</code> — 资源服务（可选，QQ 官机 Markdown 图片上传）</li>
</ul>
`