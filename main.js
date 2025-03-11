/**
 * 破碎玻璃解压游戏 - 主逻辑
 */
document.addEventListener('DOMContentLoaded', () => {
    // 显示加载界面
    showLoading();
    
    // 获取DOM元素
    const canvas = document.getElementById('game-canvas');
    const resetButton = document.getElementById('reset-button');
    const fullscreenButton = document.getElementById('fullscreen-button');
    const vibrationToggle = document.getElementById('vibration-toggle');
    const glassTypeSelect = document.getElementById('glass-type');
    const container = document.querySelector('.container');
   const fetchSounds = async () => {
    try {
        // 直接使用备选音效，不再尝试加载
        handleAudioError();
        hideLoading();
    } catch (e) {
        handleAudioError();
        hideLoading();
    }
};
    
    // 重置按钮事件
    resetButton.addEventListener('click', () => {
        glass.reset();
    });
    
    // 全屏按钮事件
    fullscreenButton.addEventListener('click', () => {
        toggleFullscreen();
    });
    
    // 振动切换按钮事件
    vibrationToggle.addEventListener('click', () => {
        const isActive = vibrationToggle.classList.toggle('active');
        glass.setVibration(isActive);
        vibrationToggle.textContent = `振动: ${isActive ? '开' : '关'}`;
        
        // 如果振动被激活，尝试一个短暂的振动以确认
        if (isActive && 'vibrate' in navigator) {
            navigator.vibrate(10);
        }
    });
    
    // 玻璃类型选择事件
    glassTypeSelect.addEventListener('change', () => {
        glass.updateGlassType(glassTypeSelect.value);
    });
    
    // 切换全屏模式
    function toggleFullscreen() {
        if (!document.fullscreenElement && 
            !document.mozFullScreenElement && 
            !document.webkitFullscreenElement && 
            !document.msFullscreenElement) {
            // 进入全屏
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
            container.classList.add('fullscreen');
            fullscreenButton.textContent = '退出全屏';
        } else {
            // 退出全屏
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            container.classList.remove('fullscreen');
            fullscreenButton.textContent = '全屏';
        }
    }
    
    // 全屏变化事件
    document.addEventListener('fullscreenchange', updateFullscreenStatus);
    document.addEventListener('webkitfullscreenchange', updateFullscreenStatus);
    document.addEventListener('mozfullscreenchange', updateFullscreenStatus);
    document.addEventListener('MSFullscreenChange', updateFullscreenStatus);
    
    function updateFullscreenStatus() {
        if (!document.fullscreenElement && 
            !document.mozFullScreenElement && 
            !document.webkitFullscreenElement && 
            !document.msFullscreenElement) {
            container.classList.remove('fullscreen');
            fullscreenButton.textContent = '全屏';
        }
    }
    
    // 处理音频加载错误
    const handleAudioError = () => {
        console.log('音频文件加载失败，正在使用默认音效...');
        
        // 创建一个简单的 Audio Context API 音效作为备选
        const createFallbackSound = (type) => {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return null;
            
            try {
                const audioCtx = new AudioContext();
                
                return () => {
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    if (type === 'break') {
                        // 玻璃破碎 - 短高音
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
                        gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                    } else {
                        // 碎片飞溅 - 嘈杂声音
                        oscillator.type = 'sawtooth';
                        oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
                        oscillator.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);
                        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
                    }
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + (type === 'break' ? 0.5 : 0.8));
                };
            } catch (e) {
                console.error('创建音频失败', e);
                return null;
            }
        };
        
        // 替换音效处理方法
        glass.playBreakSound = function() {
            const breakSound = createFallbackSound('break');
            const shatterSound = createFallbackSound('shatter');
            
            if (breakSound) breakSound();
            
            setTimeout(() => {
                if (shatterSound) shatterSound();
            }, 100);
        };
    };
    
    const preloadAudio = () => {
    console.log('使用内置音效');
    // 直接使用备选音效
    handleAudioError();
    // 立即隐藏加载界面
    hideLoading();
};
        fetchSounds();
    };
    
    // 生成音频文件
    const generateAudioFiles = async () => {
        console.log('生成音效文件...');
        
        // 显示提示
        const placeholder = document.createElement('div');
        placeholder.style.position = 'absolute';
        placeholder.style.top = '50%';
        placeholder.style.left = '50%';
        placeholder.style.transform = 'translate(-50%, -50%)';
        placeholder.style.background = 'rgba(0,0,0,0.8)';
        placeholder.style.color = 'white';
        placeholder.style.padding = '20px';
        placeholder.style.borderRadius = '5px';
        placeholder.style.zIndex = '1000';
        placeholder.style.textAlign = 'center';
        placeholder.innerHTML = `
            <p>未找到音效文件</p>
            <p>将使用替代音效</p>
            <button id="continue-btn">继续</button>
        `;
        
        document.body.appendChild(placeholder);
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            document.body.removeChild(placeholder);
            // 隐藏加载界面
            hideLoading();
        });
        
        // 使用备选音效
        handleAudioError();
    };
    
    // 显示加载界面
    function showLoading() {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading';
        loadingElement.innerHTML = `
            <div class="spinner"></div>
            <div>加载中...</div>
        `;
        document.body.appendChild(loadingElement);
    }
    
    // 隐藏加载界面
    function hideLoading() {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(loadingElement);
            }, 500);
        }
    }
    
    // 检测设备类型
    function detectDeviceType() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // 自动设置玻璃类型为有色玻璃，视觉效果更好
            glassTypeSelect.value = 'tinted';
            glass.updateGlassType('tinted');
            
            // 移动设备自动显示全屏按钮
            fullscreenButton.style.display = 'block';
            
            // 检查是否支持振动
            if (!('vibrate' in navigator)) {
                vibrationToggle.style.display = 'none';
            }
        }
    }
    
    // 页面方向更改处理 (移动端)
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            glass.resizeCanvas();
        }, 300); // 延迟以确保屏幕尺寸已更新
    });
    
    // 禁用默认触摸行为，防止缩放和滚动
    document.addEventListener('touchmove', function(e) {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // 添加PWA安装提示
    let deferredPrompt;
    const addBtn = document.createElement('button');
    addBtn.style.display = 'none';
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // 阻止Chrome 67及更早版本自动显示安装提示
        e.preventDefault();
        // 存储事件以便稍后触发
        deferredPrompt = e;
        // 更新UI通知用户可以将应用安装到桌面
        addBtn.style.display = 'block';
        
        // 创建安装按钮
        addBtn.textContent = '安装应用';
        addBtn.classList.add('install-button');
        document.querySelector('.controls').appendChild(addBtn);
        
        addBtn.addEventListener('click', (e) => {
            // 隐藏我们的自定义按钮
            addBtn.style.display = 'none';
            // 显示安装提示
            deferredPrompt.prompt();
            // 等待用户响应提示
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('用户接受了安装提示');
                } else {
                    console.log('用户取消了安装提示');
                }
                deferredPrompt = null;
            });
        });
    });
    
    // 预加载音频
    preloadAudio();
    
    // 检测设备类型
    detectDeviceType();
}); 
