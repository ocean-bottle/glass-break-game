/**
 * 音效文件获取脚本
 * 
 * 此脚本帮助用户获取必要的音效文件
 * 你可以使用Node.js运行此脚本来下载音效文件
 * 使用方法: node get-sounds.js
 */

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
    console.log('请在Node.js环境中运行此脚本');
} else {
    // 在Node.js环境中运行
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    
    // 音效文件URL (来自免费音效库)
    const soundUrls = {
        'glass-break.mp3': 'https://cdn.freesound.org/previews/331/331925_4426514-lq.mp3',
        'glass-shatter.mp3': 'https://cdn.freesound.org/previews/390/390734_6456158-lq.mp3'
    };
    
    // 创建目录
    const soundsDir = path.join(__dirname, 'assets', 'sounds');
    if (!fs.existsSync(path.join(__dirname, 'assets'))) {
        fs.mkdirSync(path.join(__dirname, 'assets'));
    }
    if (!fs.existsSync(soundsDir)) {
        fs.mkdirSync(soundsDir);
    }
    
    // 下载文件函数
    function downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`下载失败，状态码: ${response.statusCode}`));
                    return;
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlinkSync(filePath);
                reject(err);
            });
        });
    }
    
    // 下载所有文件
    async function downloadAllSounds() {
        console.log('开始下载音效文件...');
        
        for (const [fileName, url] of Object.entries(soundUrls)) {
            const filePath = path.join(soundsDir, fileName);
            
            console.log(`下载中: ${fileName}`);
            
            try {
                await downloadFile(url, filePath);
                console.log(`下载完成: ${fileName}`);
            } catch (error) {
                console.error(`下载 ${fileName} 失败: ${error.message}`);
            }
        }
        
        console.log('所有文件下载完成！');
        console.log(`音效文件已保存到: ${soundsDir}`);
    }
    
    // 执行下载
    downloadAllSounds();
}

// 或者你可以手动下载以下音效文件并放入 assets/sounds/ 目录:
// 
// 1. 玻璃初始破碎声: https://freesound.org/data/previews/412/412095_7836087-lq.mp3
//    保存为: assets/sounds/glass-break.mp3
// 
// 2. 碎片飞溅声: https://freesound.org/data/previews/444/444629_6253054-lq.mp3
//    保存为: assets/sounds/glass-shatter.mp3 
