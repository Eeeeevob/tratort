
export class AudioSystem {
    private audio: HTMLAudioElement | null = null;
    private isPlaying: boolean = false;
    private fadeInterval: number | null = null;
    private readonly MAX_VOLUME = 0.5;

    // 尝试使用绝对根路径。在大多数开发环境下，这比相对路径更可靠。
    private readonly AUDIO_SOURCE = "/tarot.mp3"; 
    // 如果本地加载失败，可以考虑的备用在线资源 (可选)
    // private readonly FALLBACK_SOURCE = "https://assets.mixkit.co/music/preview/mixkit-zen-meditation-healing-123.mp3";

    constructor() {
        this.initAudio();
    }

    private initAudio() {
        if (typeof window !== 'undefined') {
            this.audio = new Audio();
            
            this.audio.addEventListener('error', (e) => {
                const error = (e.target as HTMLAudioElement).error;
                let message = '未知错误';
                let code = 0;
                if (error) {
                    code = error.code;
                    switch (error.code) {
                        case error.MEDIA_ERR_ABORTED: message = '加载被中止'; break;
                        case error.MEDIA_ERR_NETWORK: message = '网络连接中断'; break;
                        case error.MEDIA_ERR_DECODE: message = '音频解码失败 (文件损坏或格式不兼容)'; break;
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED: 
                            message = '资源不可达或格式不支持 (404 或 MIME 类型错误)'; 
                            break;
                    }
                }
                
                // 获取浏览器尝试请求的完整 URL
                const absoluteUrl = new URL(this.AUDIO_SOURCE, window.location.origin).href;
                
                console.group('%c[AudioSystem] 资源加载异常', 'color: #ff4d4f; font-weight: bold;');
                console.error(`请求路径: ${this.AUDIO_SOURCE}`);
                console.error(`完整 URL: ${absoluteUrl}`);
                console.error(`错误原因: ${message} (代码: ${code})`);
                console.info('排查建议: \n1. 请在浏览器控制台的 Network 面板检查该 URL 是否返回 404。\n2. 确保服务器为 .mp3 文件配置了正确的 MIME 类型 (audio/mpeg)。\n3. 确认文件确实位于项目的根目录（即 index.html 同级）。');
                console.groupEnd();
            });

            this.audio.src = this.AUDIO_SOURCE;
            this.audio.loop = true;
            this.audio.volume = 0;
            this.audio.preload = "auto";
        }
    }

    /**
     * 在用户首次交互时（如点击“开始”）调用，以解除浏览器的自动播放限制
     */
    async unlock() {
        if (!this.audio) return;
        try {
            // 尝试播放以获取权限
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                if (!this.isPlaying) {
                    this.audio.pause();
                }
            }
        } catch (e) {
            // 正常的静默失败，因为自动播放限制在许多浏览器是强制的
            console.log("[AudioSystem] 自动播放受限，待用户交互后正式开启音乐。");
        }
    }

    /**
     * 切换播放/暂停状态
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
        if (!this.audio || this.audio.error) return;
        try {
            this.isPlaying = true;
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                this.fade(this.MAX_VOLUME);
            }
        } catch (e) {
            console.error("[AudioSystem] 播放尝试失败:", e);
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
     * 音量平滑过渡
     */
    private fade(targetVolume: number, onComplete?: () => void) {
        if (!this.audio) return;
        if (this.fadeInterval) clearInterval(this.fadeInterval);

        const step = targetVolume > this.audio.volume ? 0.05 : -0.05;
        
        this.fadeInterval = window.setInterval(() => {
            if (!this.audio) {
                clearInterval(this.fadeInterval!);
                return;
            }

            const nextVolume = this.audio.volume + step;
            
            if ((step > 0 && nextVolume >= targetVolume) || (step < 0 && nextVolume <= targetVolume)) {
                this.audio.volume = targetVolume;
                clearInterval(this.fadeInterval!);
                this.fadeInterval = null;
                if (onComplete) onComplete();
            } else {
                this.audio.volume = Math.max(0, Math.min(1, nextVolume));
            }
        }, 50);
    }

    getPlaying() {
        return this.isPlaying;
    }
}
