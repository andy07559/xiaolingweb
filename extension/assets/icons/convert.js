const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function convertSVGtoPNG(size) {
  // 创建画布
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  try {
    // 读取SVG文件
    const svgPath = path.join(__dirname, `icon${size}.svg`);
    const image = await loadImage(svgPath);

    // 绘制到画布
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);

    // 保存为PNG
    const buffer = canvas.toBuffer('image/png');
    const pngPath = path.join(__dirname, `icon${size}.png`);
    fs.writeFileSync(pngPath, buffer);

    console.log(`Successfully converted icon${size}.svg to PNG`);
  } catch (error) {
    console.error(`Error converting ${size}x${size} icon:`, error);
  }
}

// 转换所有尺寸
async function convertAll() {
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    await convertSVGtoPNG(size);
  }
}

convertAll(); 