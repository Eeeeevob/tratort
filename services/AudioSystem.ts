
export class AudioSystem {
    private audio: HTMLAudioElement | null = null;
    private isPlaying: boolean = false;
    private fadeInterval: number | null = null;
    private readonly MAX_VOLUME = 0.5;

    /**
     * 音频资源策略：
     * 1. 优先使用用户提供的 GitHub Raw 资源（注意：需从 blob 转换为 raw 域名）
     * 2. 本地同级路径 (./tarot.mp3)
     * 3. 本地根路径 (/tarot.mp3)
     * 4. 外部高可靠 CDN 冥想音乐 (保底)
     */
    private readonly SOURCES = [
        "https://raw.githubusercontent.com/Eeeeevob/tratort/main/public/tarot2.mp3",
        "./tarot2.mp3",
        "/tarot2.mp3",
        "https://assets.mixkit.co/music/preview/mixkit-zen-meditation-healing-123.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    ];
    
    private currentSourceIndex = 0;

    constructor() {
        this.initAudio();
    }

    private initAudio() {
        if (typeof window !== 'undefined') {
            this.audio = new Audio();
            
            // 启用跨域支持
            this.audio.crossOrigin = "anonymous";
            
            this.audio.addEventListener('error', () => {
                this.handleLoadError();
            });

            // 初始化第一个源
            this.loadSource(this.currentSourceIndex);
            
            this.audio.loop = true;
            this.audio.volume = 0;
            this.audio.preload = "auto";
        }
    }

    private loadSource(index: number) {
        if (!this.audio || index >= this.SOURCES.length) return;
        this.audio.src = this.SOURCES[index];
        this.audio.load();
    }

    private handleLoadError() {
        if (!this.audio) return;

        console.warn(`[AudioSystem] 尝试加载失败: ${this.SOURCES[this.currentSourceIndex]}`);
        
        this.currentSourceIndex++;
        
        if (this.currentSourceIndex < this.SOURCES.length) {
            const nextSrc = this.SOURCES[this.currentSourceIndex];
            console.info(`[AudioSystem] 正在尝试下一顺位资源 (${this.currentSourceIndex + 1}/${this.SOURCES.length})...`);
            this.loadSource(this.currentSourceIndex);
            
            // 如果之前已经在播放，换源后尝试继续播放（需交互权限已解除）
            if (this.isPlaying) {
                this.audio.play().catch(() => {
                    console.log("[AudioSystem] 换源后的播放等待交互触发。");
                });
            }
        } else {
            console.error("[AudioSystem] 抱歉，所有预设音频资源均无法加载。请检查网络或防火墙设置。");
        }
    }

    /**
     * 解除浏览器自动播放限制 (Autoplay Policy)
     */
    async unlock() {
        if (!this.audio) return;
        try {
            // 在用户点击时尝试静默播放获取凭证
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                if (!this.isPlaying) {
                    this.audio.pause();
                }
            }
        } catch (e) {
            console.log("[AudioSystem] 待用户明确交互后开启音乐。");
        }
    }

    /**
     * 切换播放状态
     */
    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
        return this.isPlaying;
    }

    private async start() {
        if (!this.audio) return;
        try {
            this.isPlaying = true;
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                this.fade(this.MAX_VOLUME);
            }
        } catch (e) {
            console.error("[AudioSystem] 播放失败:", e);
            this.isPlaying = false;
        }
    }

    private stop() {
        if (!this.audio) return;
        this.fade(0, () => {
            this.audio?.pause();
            this.isPlaying = false;
        });
    }

    /**
     * 优雅的淡入淡出
     */
    private fade(targetVolume: number, onComplete?: () => void) {
        if (!this.audio) return;
        if (this.fadeInterval) clearInterval(this.fadeInterval);

        const step = targetVolume > this.audio.volume ? 0.05 : -0.05;
        
        this.fadeInterval = window.setInterval(() => {
            if (!this.audio) {
                if (this.fadeInterval) clearInterval(this.fadeInterval);
                return;
            }

            const nextVolume = this.audio.volume + step;
            const isFinished = (step > 0 && nextVolume >= targetVolume) || (step < 0 && nextVolume <= targetVolume);
            
            if (isFinished) {
                this.audio.volume = targetVolume;
                if (this.fadeInterval) clearInterval(this.fadeInterval);
                this.fadeInterval = null;
                if (onComplete) onComplete();
            } else {
                this.audio.volume = Math.max(0, Math.min(1, nextVolume));
            }
        }, 60);
    }

    getPlaying() {
        return this.isPlaying;
    }
}
