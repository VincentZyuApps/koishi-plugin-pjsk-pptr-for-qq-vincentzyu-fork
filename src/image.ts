import { Context, h } from 'koishi'
import path from 'path'
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { assetDir, filePath } from './const'

/** Generate full character list image using puppeteer */
export async function drawList2(ctx: Context, characters: any[]) {
  const browser = ctx.puppeteer.browser
  const context = await browser.createBrowserContext()
  const page = await context.newPage()

  const htmlContent = generateHTML(characters)

  await page.goto('file://' + filePath)
  await page.setContent(htmlContent)
  const screenshot = await page.screenshot({ type: 'jpeg', fullPage: true, omitBackground: true })
  await page.close()
  await context.close()
  return screenshot
}

function generateHTML(characters: any[]) {
  const fontDir = path.join(assetDir, 'fonts').replaceAll('\\', '/')
  let html = `
  <html>
    <head>
      <style>
        @font-face {
          font-family: YurukaStd;
          src: local("YurukaStd"),url('file://${fontDir}/YurukaStd.woff2') format("woff2")
        }
        @font-face {
          font-family: SSFangTangTi;
          src: local("SSFangTangTi"),url('file://${fontDir}/ShangShouFangTangTi.woff2') format("woff2")
        }
        .character {
          position: relative;
          display: inline-block;
          margin: 5px;
          background-color: transparent;
        }
        .character img {
          max-width: 100px;
          opacity: 1;
        }
        .character .number {
          position: absolute;
          top: 0;
          left: 0;
          color: red;
          font-weight: bold;
          font-size: 30px;
          font-family: 'YurukaStd', 'SSFangTangTi';
        }
      </style>
    </head>
    <body>
  `

  characters.forEach((character, index) => {
    const imgPath = 'file://' + assetDir.replaceAll('\\', '/') + `/img/${character.img}`
    html += `
      <div class="character">
        <div class="number">${index}</div>
        <img src="${imgPath}" alt="${character.name}">
      </div>
    `
  })

  html += `
    </body>
  </html>
  `

  return html
}

/** Generate image grid from a directory of PNG files */
export async function drawList(ctx: Context, picsDir: string) {
  const browser = ctx.puppeteer.browser
  const context = await browser.createBrowserContext()
  const page = await context.newPage()

  const html = generateHTMLFromPictures(picsDir)

  await page.setViewport({ width: 3454, height: 256, deviceScaleFactor: 1 })
  await page.goto('file://' + filePath)
  await page.setContent(html)
  const screenshot = await page.screenshot({ type: 'jpeg', fullPage: true, omitBackground: true })
  await page.close()
  await context.close()
  return screenshot
}

function generateHTMLFromPictures(picsDir: string): string {
  const files = readdirSync(picsDir)
  const pngFiles = files.filter((file) => path.extname(file).toLowerCase() === '.png')
  const sortedPngFiles = pngFiles.sort((a, b) => {
    const numA = parseInt(path.basename(a, '.png'), 10)
    const numB = parseInt(path.basename(b, '.png'), 10)
    return numA - numB
  })

  let html = `
  <html>
    <head>
      <style>
        body { background-color: #282C35; }
        .gallery { display: flex; flex-wrap: wrap; justify-content: center; }
        .gallery img { width: 9.09%; padding: 5px; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div class="gallery">
  `

  const imagesPerRow = 11
  for (let i = 0; i < sortedPngFiles.length; i += imagesPerRow) {
    const rowImages = sortedPngFiles.slice(i, i + imagesPerRow)
    rowImages.forEach((file) => {
      const imagePath = path.join(picsDir, file)
      html += `<img src="${imagePath}" alt="${file}">`
    })
  }

  html += `
      </div>
    </body>
  </html>
  `

  return html
}

/** Render a single PJSK emoji sticker image */
export async function draw(
  ctx: Context,
  text: string,
  imgPath: string,
  specifiedX: number,
  specifiedY: number,
  specifiedRotate: number,
  specifiedFontSize: number,
  color: string,
  curve: boolean,
  spaceSize: number,
  angle: number,
) {
  const browser = ctx.puppeteer.browser
  const context = await browser.createBrowserContext()
  const page = await context.newPage()

  const htmlContent = generateStickerHTML(text, imgPath, specifiedX, specifiedY, specifiedRotate, specifiedFontSize, color, curve, spaceSize, angle)

  await page.setViewport({ width: 296, height: 256, deviceScaleFactor: 1 })
  await page.goto('file://' + filePath)
  await page.setContent(h.unescape(htmlContent), { waitUntil: 'load' })

  const canvas = await page.$('canvas#myCanvas')
  const buffer = await canvas!.screenshot({ type: 'png', omitBackground: true })

  await page.close()
  await context.close()

  return buffer
}

function generateStickerHTML(
  text: string,
  imgPath: string,
  specifiedX: number,
  specifiedY: number,
  specifiedRotate: number,
  specifiedFontSize: number,
  color: string,
  curve: boolean,
  spaceSize: number,
  angle: number,
): string {
  const fontDir = path.join(assetDir, 'fonts').replaceAll('\\', '/')
  return `
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @font-face {
      font-family: 'YurukaStd';
      src: local('YurukaStd'), url('file://${fontDir}/YurukaStd.woff2') format('woff2');
    }
    @font-face {
      font-family: 'SSFangTangTi';
      src: local('SSFangTangTi'), url('file://${fontDir}/ShangShouFangTangTi.woff2') format('woff2');
    }
    .canvas { height: 256px; width: 296px; }
    body {
      margin: 0;
      padding: 0;
      background-color: transparent;
      font-family: 'YurukaStd', 'SSFangTangTi';
    }
  </style>
</head>
<body>
  <div class="canvas">
    <canvas id="myCanvas" width="296" height="256">
  </div>
  <script>
    window.onload = () => {
      const canvas = document.getElementById("myCanvas");
      const context = canvas.getContext('2d');
      const text = ${JSON.stringify(text).replace(/</g, '\\u003c')};
      const x = ${Number(specifiedX)};
      const y = ${Number(specifiedY)};
      const rotate = ${specifiedRotate};
      const fontSize = ${JSON.stringify(String(specifiedFontSize))};
      const color = ${JSON.stringify(color)};
      const curve = ${curve};
      const position = { x, y }
      const spaceSize = ${spaceSize};
      let angle = ${angle};
      const img = new Image();
      img.src = ${JSON.stringify(imgPath)};

      img.onload = () => { draw(context) }

      function draw(context) {
        context.canvas.width = 296;
        context.canvas.height = 256;

        var hRatio = context.canvas.width / img.width;
        var vRatio = context.canvas.height / img.height;
        var ratio = Math.min(hRatio, vRatio);
        var centerShift_x = (context.canvas.width - img.width * ratio) / 2;
        var centerShift_y = (context.canvas.height - img.height * ratio) / 2;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
        context.font = \`\${fontSize}px YurukaStd, SSFangTangTi\`;
        context.lineWidth = 9;
        context.save();

        context.translate(position.x, position.y);
        context.rotate(rotate / 10);
        context.textAlign = "center";
        context.strokeStyle = "white";
        context.fillStyle = color;
        var lines = text.split("\\\\n");
        if (curve) {
          for (let line of lines) {
            for (let i = 0; i < line.length; i++) {
              context.rotate(angle / line.length / 2.5);
              context.save();
              context.translate(0, -1 * fontSize * 3.5);
              context.strokeText(line[i], 0, 0);
              context.fillText(line[i], 0, 0);
              context.restore();
            }
          }
        } else {
          for (var i = 0, k = 0; i < lines.length; i++) {
            context.strokeText(lines[i], 0, k);
            context.fillText(lines[i], 0, k);
            k += spaceSize;
          }
          context.restore();
        }
      }
    }
  </script>
</body>
</html>`
}