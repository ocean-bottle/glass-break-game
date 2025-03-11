/**
 * 玻璃破碎效果实现
 */
class Glass {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 设置默认参数
        this.options = {
            maxShards: 40,          // 最大碎片数量
            minShards: 20,          // 最小碎片数量
            minShardSize: 5,        // 最小碎片尺寸
            maxShardSize: 20,       // 最大碎片尺寸
            gravity: 0.6,           // 重力
            resistance: 0.99,       // 空气阻力
            initialVelocity: 15,    // 初始速度
            glassOpacity: 0.4,      // 玻璃透明度
            vibrateOnBreak: true,   // 破碎时振动
            glassType: 'normal',    // 玻璃类型：normal, thick, tinted
            multiTouchEnabled: true, // 是否允许多点触控
            ...options              // 合并用户定义的参数
        };
        
        // 初始化Matter.js引擎
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.world.gravity.y = this.options.gravity;
        
        // 碎片数组
        this.shards = [];
        
        // 音效
        this.glassBreakSound = new Audio('assets/sounds/glass-break.mp3');
        this.glassShatterSound = new Audio('assets/sounds/glass-shatter.mp3');
        
        // 初始化状态
        this.isBroken = false;
        this.lastTime = 0;
        this.activePointers = new Map(); // 跟踪活动的触摸点
        this.swipeData = null;           // 滑动数据
        
        // 性能监控
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdateTime = 0;
        
        // 设置画布尺寸
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 开始渲染循环
        this.animate(0);
        
        // 添加事件监听器
        this.addEventListeners();
    }
    
    // 设置画布尺寸
    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        
        // 重置物理世界边界
        this.setupBoundaries();
    }
    
    // 设置物理世界边界
    setupBoundaries() {
        // 清除旧边界
        Matter.Composite.clear(this.world);
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 添加边界墙
        const wallOptions = { isStatic: true, restitution: 0.7 };
        
        // 下边界（地面）
        Matter.Composite.add(this.world, [
            Matter.Bodies.rectangle(width / 2, height + 50, width + 100, 100, wallOptions), // 底部
            Matter.Bodies.rectangle(-50, height / 2, 100, height + 100, wallOptions),      // 左侧
            Matter.Bodies.rectangle(width + 50, height / 2, 100, height + 100, wallOptions) // 右侧
        ]);
    }
    
    // 添加事件监听器
    addEventListeners() {
        // 点击事件
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // 记录每个触摸点
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const pointer = {
                    id: touch.identifier,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    lastX: touch.clientX,
                    lastY: touch.clientY,
                    startTime: Date.now()
                };
                
                this.activePointers.set(touch.identifier, pointer);
                
                // 如果不是多点触控或者是第一个触摸点，直接破碎
                if (!this.options.multiTouchEnabled || this.activePointers.size === 1) {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = touch.clientX - rect.left;
                    const y = touch.clientY - rect.top;
                    this.breakGlass(x, y);
                }
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            // 更新触摸点位置
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (this.activePointers.has(touch.identifier)) {
                    const pointer = this.activePointers.get(touch.identifier);
                    
                    // 如果滑动足够距离且玻璃尚未破碎，记录滑动数据
                    if (!this.isBroken) {
                        const dx = touch.clientX - pointer.startX;
                        const dy = touch.clientY - pointer.startY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 30) { // 滑动距离超过30px
                            this.swipeData = {
                                startX: pointer.startX,
                                startY: pointer.startY,
                                endX: touch.clientX,
                                endY: touch.clientY,
                                velocity: distance / (Date.now() - pointer.startTime) * 10 // 计算速度
                            };
                            
                            const rect = this.canvas.getBoundingClientRect();
                            const x = pointer.startX - rect.left;
                            const y = pointer.startY - rect.top;
                            
                            // 基于滑动破碎玻璃
                            this.breakGlassWithSwipe(x, y, this.swipeData);
                        }
                    }
                    
                    // 更新上一次位置
                    pointer.lastX = touch.clientX;
                    pointer.lastY = touch.clientY;
                }
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // 移除结束的触摸点
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                this.activePointers.delete(touch.identifier);
            }
            
            // 如果所有触摸点都结束了，重置滑动数据
            if (this.activePointers.size === 0) {
                this.swipeData = null;
            }
        });
    }
    
    // 处理点击事件
    handleClick(e) {
        if (this.isBroken) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.breakGlass(x, y);
    }
    
    // 破碎玻璃
    breakGlass(x, y) {
        this.isBroken = true;
        
        // 播放破碎音效
        this.playBreakSound();
        
        // 触发振动反馈 (如果支持且启用)
        if (this.options.vibrateOnBreak && 'vibrate' in navigator) {
            navigator.vibrate([15, 10, 30]);
        }
        
        // 计算碎片数量
        const numShards = Math.floor(
            Math.random() * (this.options.maxShards - this.options.minShards + 1) + 
            this.options.minShards
        );
        
        // 创建碎片
        for (let i = 0; i < numShards; i++) {
            this.createShard(x, y);
        }
    }
    
    // 基于滑动手势的破碎
    breakGlassWithSwipe(x, y, swipeData) {
        if (this.isBroken) {
            return;
        }
        
        this.isBroken = true;
        
        // 播放破碎音效
        this.playBreakSound();
        
        // 触发强烈振动反馈
        if (this.options.vibrateOnBreak && 'vibrate' in navigator) {
            navigator.vibrate([20, 10, 40, 10, 20]);
        }
        
        // 根据滑动速度调整碎片数量和初始速度
        const velocityFactor = Math.min(3, Math.max(1, swipeData.velocity / 5));
        const numShards = Math.floor(
            Math.random() * (this.options.maxShards - this.options.minShards + 1) + 
            this.options.minShards * velocityFactor
        );
        
        // 计算滑动方向
        const angle = Math.atan2(
            swipeData.endY - swipeData.startY,
            swipeData.endX - swipeData.startX
        );
        
        // 创建碎片，使用滑动方向
        for (let i = 0; i < numShards; i++) {
            this.createShardWithDirection(x, y, angle, velocityFactor);
        }
    }
    
    // 创建单个碎片
    createShard(x, y) {
        // 随机碎片尺寸
        const size = Math.random() * 
            (this.options.maxShardSize - this.options.minShardSize) + 
            this.options.minShardSize;
        
        // 调整厚玻璃的碎片尺寸
        const adjustedSize = this.options.glassType === 'thick' ? size * 1.5 : size;
        
        // 随机碎片形状（多边形）
        const vertices = [];
        const sides = Math.floor(Math.random() * 3) + 3; // 3-5边的多边形
        
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            const radius = adjustedSize * (0.7 + Math.random() * 0.3); // 带一些随机变化
            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        // 创建物理碎片
        const shard = Matter.Bodies.fromVertices(x, y, [vertices], {
            render: { fillStyle: '#89CFF0' },
            restitution: this.options.glassType === 'thick' ? 0.2 : 0.3, // 厚玻璃弹性更小
            friction: 0.2,
            density: this.options.glassType === 'thick' ? 0.002 : 0.001 // 厚玻璃密度更大
        });
        
        // 应用随机初始速度
        const angle = Math.random() * Math.PI * 2;
        const speed = this.options.initialVelocity * (0.5 + Math.random() * 0.5);
        Matter.Body.setVelocity(shard, {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        });
        
        // 应用随机旋转
        Matter.Body.setAngularVelocity(shard, (Math.random() - 0.5) * 0.2);
        
        // 添加到世界和碎片数组
        Matter.Composite.add(this.world, shard);
        this.shards.push({
            body: shard,
            opacity: 1.0,
            color: this.getGlassColor()
        });
    }
    
    // 创建具有特定方向的碎片
    createShardWithDirection(x, y, direction, velocityFactor = 1) {
        // 随机碎片尺寸
        const size = Math.random() * 
            (this.options.maxShardSize - this.options.minShardSize) + 
            this.options.minShardSize;
        
        // 调整厚玻璃的碎片尺寸
        const adjustedSize = this.options.glassType === 'thick' ? size * 1.5 : size;
        
        // 随机碎片形状（多边形）
        const vertices = [];
        const sides = Math.floor(Math.random() * 3) + 3; // 3-5边的多边形
        
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            const radius = adjustedSize * (0.7 + Math.random() * 0.3); // 带一些随机变化
            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        // 创建物理碎片
        const shard = Matter.Bodies.fromVertices(x, y, [vertices], {
            render: { fillStyle: '#89CFF0' },
            restitution: this.options.glassType === 'thick' ? 0.2 : 0.3,
            friction: 0.2,
            density: this.options.glassType === 'thick' ? 0.002 : 0.001
        });
        
        // 根据滑动方向应用初始速度
        const angleVariation = (Math.random() - 0.5) * Math.PI / 2; // 在方向上添加一些随机变化
        const finalAngle = direction + angleVariation;
        const speed = this.options.initialVelocity * velocityFactor * (0.8 + Math.random() * 0.4);
        
        Matter.Body.setVelocity(shard, {
            x: Math.cos(finalAngle) * speed,
            y: Math.sin(finalAngle) * speed
        });
        
        // 应用随机旋转
        Matter.Body.setAngularVelocity(shard, (Math.random() - 0.5) * 0.3 * velocityFactor);
        
        // 添加到世界和碎片数组
        Matter.Composite.add(this.world, shard);
        this.shards.push({
            body: shard,
            opacity: 1.0,
            color: this.getGlassColor()
        });
    }
    
    // 获取玻璃颜色（基于玻璃类型）
    getGlassColor() {
        let colors;
        
        switch (this.options.glassType) {
            case 'tinted':
                colors = [
                    'rgba(46, 204, 113, 0.7)',   // 绿色
                    'rgba(52, 152, 219, 0.7)',   // 蓝色
                    'rgba(155, 89, 182, 0.7)',   // 紫色
                    'rgba(241, 196, 15, 0.7)',   // 黄色
                    'rgba(230, 126, 34, 0.7)'    // 橙色
                ];
                break;
            case 'thick':
                colors = [
                    'rgba(127, 140, 141, 0.8)',  // 深灰色
                    'rgba(52, 73, 94, 0.8)',     // 深蓝灰色
                    'rgba(44, 62, 80, 0.8)'      // 更深的蓝灰色
                ];
                break;
            default: // normal
                colors = [
                    'rgba(137, 207, 240, 0.7)', // 浅蓝色
                    'rgba(173, 216, 230, 0.7)', // 浅钢蓝色
                    'rgba(176, 224, 230, 0.7)', // 粉蓝色
                    'rgba(135, 206, 235, 0.7)', // 天蓝色
                    'rgba(135, 206, 250, 0.7)'  // 浅天蓝色
                ];
        }
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // 播放破碎音效
    playBreakSound() {
        // 播放玻璃破碎的声音
        this.glassBreakSound.currentTime = 0;
        this.glassBreakSound.play();
        
        // 稍后播放碎片声音
        setTimeout(() => {
            this.glassShatterSound.currentTime = 0;
            this.glassShatterSound.play();
        }, 100);
    }
    
    // 重置玻璃
    reset() {
        // 清除所有碎片
        for (const shard of this.shards) {
            Matter.Composite.remove(this.world, shard.body);
        }
        this.shards = [];
        
        // 重置状态
        this.isBroken = false;
        this.swipeData = null;
        this.activePointers.clear();
    }
    
    // 更新玻璃类型
    updateGlassType(type) {
        if (['normal', 'thick', 'tinted'].includes(type)) {
            this.options.glassType = type;
            
            // 如果已经破碎，重置以显示新类型
            if (this.isBroken) {
                this.reset();
            }
        }
    }
    
    // 设置振动开关
    setVibration(enabled) {
        this.options.vibrateOnBreak = enabled;
    }
    
    // 渲染循环
    animate(time) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        // 更新FPS计数器
        this.frameCount++;
        if (time - this.lastFpsUpdateTime > 1000) { // 每秒更新一次
            this.fps = Math.round((this.frameCount * 1000) / (time - this.lastFpsUpdateTime));
            this.frameCount = 0;
            this.lastFpsUpdateTime = time;
        }
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 更新物理引擎
        Matter.Engine.update(this.engine, deltaTime);
        
        // 绘制玻璃（如果未破碎）
        if (!this.isBroken) {
            this.drawGlass();
        }
        
        // 绘制碎片
        this.drawShards();
        
        // 继续动画循环
        requestAnimationFrame((t) => this.animate(t));
    }
    
    // 绘制完整的玻璃
    drawGlass() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 根据玻璃类型创建不同的渐变背景
        let gradient;
        let reflectionOpacity = 0.15;
        
        switch (this.options.glassType) {
            case 'tinted':
                gradient = this.ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, 'rgba(46, 204, 113, 0.3)');
                gradient.addColorStop(1, 'rgba(52, 152, 219, 0.4)');
                reflectionOpacity = 0.2;
                break;
            case 'thick':
                gradient = this.ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, 'rgba(52, 73, 94, 0.4)');
                gradient.addColorStop(1, 'rgba(44, 62, 80, 0.5)');
                reflectionOpacity = 0.1;
                break;
            default: // normal
                gradient = this.ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                gradient.addColorStop(1, 'rgba(137, 207, 240, 0.25)');
        }
        
        // 绘制玻璃背景
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
        
        // 添加反光效果
        this.ctx.fillStyle = `rgba(255, 255, 255, ${reflectionOpacity})`;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(width * 0.3, 0);
        this.ctx.lineTo(0, height * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 厚玻璃添加额外的边缘光晕
        if (this.options.glassType === 'thick') {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.lineWidth = 10;
            this.ctx.strokeRect(5, 5, width - 10, height - 10);
        }
    }
    
    // 绘制碎片
    drawShards() {
        this.ctx.lineWidth = 1;
        
        for (let i = this.shards.length - 1; i >= 0; i--) {
            const shard = this.shards[i];
            const vertices = shard.body.vertices;
            
            // 碎片逐渐消失
            shard.opacity -= 0.0003;
            
            // 如果碎片已完全透明，从数组中移除
            if (shard.opacity <= 0) {
                Matter.Composite.remove(this.world, shard.body);
                this.shards.splice(i, 1);
                continue;
            }
            
            // 绘制碎片
            this.ctx.fillStyle = shard.color.replace(/[\d\.]+\)$/, `${shard.opacity.toFixed(2)})`);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${shard.opacity.toFixed(2)})`;
            
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            
            for (let j = 1; j < vertices.length; j++) {
                this.ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // 添加反光效果
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${shard.opacity * 0.5})`;
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            this.ctx.lineTo(vertices[1].x, vertices[1].y);
            this.ctx.stroke();
        }
        
        // 如果所有碎片都消失，自动重置
        if (this.isBroken && this.shards.length === 0) {
            this.reset();
        }
    }
} 