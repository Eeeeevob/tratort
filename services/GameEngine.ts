
import * as THREE from 'three';
import { GameState, InputMode, Gesture, TarotCardData, CardHistory, ImageSize } from '../types';
import { TAROT_DECK, PINCH_THRESHOLD } from '../constants';
import { TextureGenerator } from './TextureGenerator';
import { AudioSystem } from './AudioSystem';
import { GenAIService } from './GenAIService';

export class GameEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2 = new THREE.Vector2();
    private audio: AudioSystem;
    
    // Physical Safety Parameters for Horizontal Layout
    private readonly safetyConfig = {
        baseConfirmDistance: 8.5,   // Further increased to ensure full visibility
        minConfirmDistance: 5.0,    
        yOffset: 0.2,               // Slightly lifted to clear the reading panel
        safetyMargin: 4.5,          // Padding around carousel objects
        nearMargin: 0.8,            // Buffer from camera.near
        pushOutStep: 0.1,           // Iterative distance change
        polygonOffsetFactor: -1,    // Depth bias
        polygonOffsetUnits: -4
    };

    // States
    private state: GameState = GameState.IDLE;
    private inputMode: InputMode = InputMode.HANDS;
    private currentGesture: Gesture = Gesture.NONE;
    private gestureBuffer: Gesture[] = [];
    private readonly BUFFER_SIZE = 4; // Further reduced for near-instant response
    private gestureCooldown: number = 0;
    
    // Gesture Verification Timers
    private pinchStartTime: number = 0;
    private readonly PINCH_REQUIRED_HOLD = 80; // Shorter hold for faster grab
    private fistStartTime: number = 0;
    private readonly FIST_REQUIRED_HOLD = 40;  // Extremely low hold for FIST

    private hands: any = null;
    private isHandTrackingAvailable: boolean = false;
    
    // Assets Cache
    private cardTextures: Map<string, THREE.Texture> = new Map();
    private backTexture: THREE.Texture | null = null;
    
    // Objects
    private deck: TarotCardData[] = [...TAROT_DECK];
    private history: CardHistory[] = [];
    private sessionDrawnCount: number = 0; // 当前轮次已抽取的卡牌数量
    private readonly MAX_DRAW_PER_SESSION = 3; // 每轮限制三张

    private currentCardMesh: THREE.Group | null = null;
    private cardRing: THREE.Group | null = null;
    private particles: THREE.Points | null = null;
    private fireflies: THREE.Points | null = null;
    private hoveredCard: THREE.Mesh | null = null;
    
    // Layout Config
    private targetRotation = new THREE.Euler();
    private targetPosition = new THREE.Vector3(0, 0, 0);
    private targetScale = new THREE.Vector3(1, 1, 1);
    private lerpSpeed = 0.12;
    private isReversed: boolean = false;
    private activeCardData: TarotCardData | null = null;
    
    // Optimized Horizontal Carousel Parameters
    private ringRadius: number = 12.0; 
    private ringCenterZ: number = 22.0; 
    private ringRotationY: number = Math.PI; 
    private ringVelocity: number = 0;
    private previewAnchor = new THREE.Vector3(0, 0, 11.5);

    // Debug Data
    private debugInfo = {
        intersected: false,
        pushCount: 0,
        actualDist: 0,
        near: 0.1
    };

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.raycaster = new THREE.Raycaster();
        this.audio = new AudioSystem();
        
        this.debugInfo.near = this.camera.near;
        (window as any).resetDeck = () => this.resetDeck();
        (window as any).toggleMusic = () => this.toggleMusic();
        (window as any).tarotEngine = this; // Expose for HTML click handlers
    }

    async init() {
        this.setupScene();
        this.setupLights();
        this.shuffleDeck(); // Standard fair shuffle
        await this.generateAssets();
        this.createCardRing();
        this.createFireflies();
        this.setupEventListeners();
        this.setupSplashEvents();
        this.animate();
        this.setState(GameState.READY);
    }

    /**
     * Standard fair Fisher-Yates shuffle to ensure equal probability.
     */
    private shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    private toggleMusic() {
        const isPlaying = this.audio.toggle();
        const btn = document.getElementById('music-toggle-btn');
        if (btn) {
            btn.innerHTML = isPlaying ? '🔊' : '🔇';
            btn.className = isPlaying ? 'text-indigo-400' : 'text-gray-600';
        }
    }

    private setupSplashEvents() {
        const btnCamera = document.getElementById('btn-start-camera');
        const btnMouse = document.getElementById('btn-start-mouse');

        const unlockAudio = async () => {
            await this.audio.unlock();
            if (!this.audio.getPlaying()) {
                this.toggleMusic(); // Try starting music on first interaction
            }
        };

        btnCamera?.addEventListener('click', async () => {
            await unlockAudio();
            try {
                btnCamera.innerText = "唤醒星灵...";
                await this.initHandTracking();
                this.inputMode = InputMode.HANDS;
                this.hideSplash();
            } catch (e) {
                console.error("Camera Init Failed:", e);
                document.getElementById('error-message')?.classList.remove('hidden');
                btnCamera.innerText = "重试连接";
            }
        });

        btnMouse?.addEventListener('click', async () => {
            await unlockAudio();
            this.inputMode = InputMode.MOUSE;
            this.updateUIMode("传统占卜模式");
            this.hideSplash();
        });
    }

    private hideSplash() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 800);
        }
    }

    private setupScene() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('canvas-container')?.appendChild(this.renderer.domElement);
        
        this.camera.position.set(0, 0, 18);
        this.camera.lookAt(0, 0, 0);
        
        this.scene.background = new THREE.Color(0x050508);
        this.scene.fog = new THREE.Fog(0x050508, 10, 50);
    }

    private setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const p1 = new THREE.PointLight(0xfff5cc, 2.2, 100); 
        p1.position.set(20, 20, 20);
        this.scene.add(p1);
        const p2 = new THREE.PointLight(0x8a9cf5, 1.8, 80); 
        p2.position.set(-20, 10, 15);
        this.scene.add(p2);
    }

    private async generateAssets() {
        const loader = new THREE.TextureLoader();
        this.backTexture = loader.load(TextureGenerator.generateCardBack());
        const loadPromises = this.deck.map(card => {
            return new Promise<void>((resolve) => {
                loader.load(card.imageUrl, (tex) => {
                    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                    this.cardTextures.set(card.imageUrl, tex);
                    resolve();
                }, undefined, () => resolve());
            });
        });
        await Promise.all(loadPromises);
    }

    private createCardRing() {
        if (this.cardRing) this.scene.remove(this.cardRing);
        this.cardRing = new THREE.Group();
        this.cardRing.position.z = this.ringCenterZ; 

        const cardGeo = new THREE.PlaneGeometry(1.8, 2.9);
        const backMat = new THREE.MeshStandardMaterial({ 
            map: this.backTexture, 
            side: THREE.DoubleSide, 
            metalness: 0.9, 
            roughness: 0.1,
            emissive: new THREE.Color(0x221100),
            emissiveIntensity: 0.2
        });

        const count = this.deck.length;
        this.deck.forEach((data, i) => {
            const angle = (i / count) * Math.PI * 2;
            const card = new THREE.Mesh(cardGeo, backMat.clone());
            card.position.x = Math.cos(angle) * this.ringRadius;
            card.position.z = Math.sin(angle) * this.ringRadius;
            card.position.y = 0; 
            card.rotation.y = -angle + Math.PI / 2;
            card.userData = { cardData: data };
            this.cardRing!.add(card);
        });
        this.scene.add(this.cardRing);
    }

    private createFireflies() {
        const count = 50;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0xfff9e3, size: 0.1, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
        this.fireflies = new THREE.Points(geo, mat);
        this.scene.add(this.fireflies);
    }

    private async initHandTracking() {
        const Hands = (window as any).Hands;
        const Camera = (window as any).Camera;
        if (!Hands || !Camera) throw new Error("MediaPipe not loaded");
        this.hands = new Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        this.hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.8, minTrackingConfidence: 0.7 });
        this.hands.onResults((results: any) => this.processHandResults(results));
        const videoElement = document.getElementById('video-feed') as HTMLVideoElement;
        const camera = new Camera(videoElement, { onFrame: async () => { await this.hands.send({ image: videoElement }); }, width: 640, height: 480 });
        await camera.start();
        this.isHandTrackingAvailable = true;
        this.updateUIMode("感知模式已激活");
    }

    private processHandResults(results: any) {
        if (this.inputMode !== InputMode.HANDS) return;
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.handleGestureUpdate(Gesture.NONE);
            this.ringVelocity *= 0.95; 
            return;
        }
        const landmarks = results.multiHandLandmarks[0];
        const rawGesture = this.detectGestureRaw(landmarks);
        this.gestureBuffer.push(rawGesture);
        if (this.gestureBuffer.length > this.BUFFER_SIZE) this.gestureBuffer.shift();
        const stableGesture = this.getStableGesture();
        this.handleGestureUpdate(stableGesture, landmarks);
        const wrist = landmarks[0];
        const currentX = -(wrist.x * 2 - 1);
        const currentY = -(wrist.y * 2 - 1);
        if (this.state === GameState.READY) {
            const dx = currentX - this.mouse.x;
            this.ringVelocity = dx * 1.2; 
            this.checkHover();
        }
        this.mouse.x = currentX;
        this.mouse.y = currentY;
    }

    private checkHover() {
        if (this.sessionDrawnCount >= this.MAX_DRAW_PER_SESSION) return;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cardRing!.children);
        if (this.hoveredCard) {
            (this.hoveredCard.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
            this.hoveredCard = null;
        }
        if (intersects.length > 0) {
            this.hoveredCard = intersects[0].object as THREE.Mesh;
            (this.hoveredCard.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
        }
    }

    private getStableGesture(): Gesture {
        const counts = this.gestureBuffer.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {} as any);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as Gesture;
    }

    private detectGestureRaw(landmarks: any): Gesture {
        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const getDist = (p1: any, p2: any = wrist) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

        const isFingerFolded = (tip: number, mcp: number) => {
            return getDist(landmarks[tip]) < getDist(landmarks[mcp]);
        };

        const middleFolded = isFingerFolded(12, 9);
        const ringFolded = isFingerFolded(16, 13);
        const pinkyFolded = isFingerFolded(20, 17);
        const indexFolded = isFingerFolded(8, 5);

        if (indexFolded && (middleFolded ? 1 : 0) + (ringFolded ? 1 : 0) + (pinkyFolded ? 1 : 0) >= 2) {
            return Gesture.FIST;
        }

        const distPinch = getDist(thumbTip, indexTip);
        if (distPinch < PINCH_THRESHOLD && !indexFolded) {
            return Gesture.PINCH;
        }

        const extendedFingers = [8, 12, 16, 20].filter(tipIdx => {
            const pipIdx = tipIdx - 2;
            return getDist(landmarks[tipIdx]) > getDist(landmarks[pipIdx]) * 1.05;
        }).length;

        if (extendedFingers >= 3) return Gesture.OPEN;

        return Gesture.NONE;
    }

    private handleGestureUpdate(gesture: Gesture, landmarks?: any) {
        const now = Date.now();
        
        let processedGesture = gesture;

        if (gesture === Gesture.PINCH) {
            if (this.pinchStartTime === 0) this.pinchStartTime = now;
            if (now - this.pinchStartTime < this.PINCH_REQUIRED_HOLD) {
                processedGesture = (this.currentGesture === Gesture.PINCH) ? Gesture.PINCH : Gesture.NONE;
            }
        } else {
            this.pinchStartTime = 0;
        }

        if (gesture === Gesture.FIST) {
            if (this.fistStartTime === 0) this.fistStartTime = now;
            if (now - this.fistStartTime < this.FIST_REQUIRED_HOLD) {
                processedGesture = (this.currentGesture === Gesture.FIST) ? Gesture.FIST : Gesture.NONE;
            }
        } else {
            this.fistStartTime = 0;
        }

        if (this.currentGesture !== processedGesture && now > this.gestureCooldown) {
            this.currentGesture = processedGesture;
            this.onGestureEnter(processedGesture);
            this.gestureCooldown = now + 50; 
        }
        this.onGestureHold(this.currentGesture, landmarks);
        this.updateUIBadges(this.currentGesture);
    }

    private onGestureEnter(gesture: Gesture) {
        if (gesture === Gesture.PINCH && this.state === GameState.READY) {
            this.tryGrab();
        } else if (gesture === Gesture.FIST) {
            if (this.state === GameState.PREVIEW) this.confirmCard();
            else if (this.state === GameState.CONFIRMED) this.triggerDisintegrate();
            else if (this.state === GameState.READY && this.sessionDrawnCount >= this.MAX_DRAW_PER_SESSION) {
                this.resetDeck(); 
            }
        }
    }

    private onGestureHold(gesture: Gesture, landmarks?: any) {
        if (gesture === Gesture.PINCH && this.state === GameState.GRABBING) {
            this.targetPosition.set(this.mouse.x * 6, this.mouse.y * 5, 12.0);
        }
    }

    /**
     * Grabs a card with truly random equal probability.
     */
    private tryGrab() {
        if (this.sessionDrawnCount >= this.MAX_DRAW_PER_SESSION) return;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cardRing!.children);
        if (intersects.length > 0) {
            const selectedMesh = intersects[0].object as THREE.Mesh;
            const cardData = selectedMesh.userData.cardData as TarotCardData;
            
            this.activeCardData = cardData;
            
            // Equal 50/50 probability for orientation
            this.isReversed = Math.random() < 0.5;
            
            this.deck = this.deck.filter(c => c.id !== cardData.id);
            this.createCardRing();
            this.createCardMesh(this.activeCardData);
            this.setState(GameState.GRABBING);
            this.updateDeckCount();
            if (this.hoveredCard) this.hoveredCard = null;
        }
    }

    private createCardMesh(data: TarotCardData) {
        if (this.currentCardMesh) this.scene.remove(this.currentCardMesh);
        const group = new THREE.Group();
        const geo = new THREE.PlaneGeometry(2.4, 3.8);
        const frontCanvasTex = new THREE.CanvasTexture(this.createCanvasForCard(data));
        frontCanvasTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        const baseMatConfig = {
            metalness: 0.1, 
            roughness: 0.8,
            polygonOffset: true,
            polygonOffsetFactor: this.safetyConfig.polygonOffsetFactor,
            polygonOffsetUnits: this.safetyConfig.polygonOffsetUnits
        };

        const frontMat = new THREE.MeshStandardMaterial({ ...baseMatConfig, map: frontCanvasTex, side: THREE.FrontSide });
        const backMat = new THREE.MeshStandardMaterial({ ...baseMatConfig, map: this.backTexture, side: THREE.BackSide });
        
        const frontMesh = new THREE.Mesh(geo, frontMat);
        const backMesh = new THREE.Mesh(geo, backMat);
        backMesh.rotation.y = Math.PI;
        
        group.add(frontMesh, backMesh);
        group.renderOrder = 2000;
        
        this.currentCardMesh = group;
        this.targetScale.set(1, 1, 1);
        this.scene.add(group);
    }

    private createCanvasForCard(data: TarotCardData): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 800;
        const ctx = canvas.getContext('2d')!;
        const templateImg = new Image();
        templateImg.src = TextureGenerator.generateCardFront(data.name_zh, data.name_en, data.id);
        const artImg = new Image();
        artImg.crossOrigin = "anonymous";
        artImg.src = data.generatedImageUrl || data.imageUrl; // Use AI art if available
        ctx.fillStyle = "#fff";
        ctx.fillRect(0,0,512,800);
        ctx.drawImage(templateImg, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 336, 180, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(artImg, 256-180, 336-180, 360, 360);
        ctx.restore();
        return canvas;
    }

    private confirmCard() {
        this.sessionDrawnCount++;
        this.setState(GameState.CONFIRMED);
        this.showReadingUI();
        this.history.unshift({ 
            name: this.activeCardData!.name_zh, 
            isReversed: this.isReversed, 
            timestamp: Date.now(),
            cardData: { ...this.activeCardData! }
        });
        this.updateHistoryUI();
        this.updateDeckCount();
        this.targetRotation.y += Math.PI * 10; 
        this.targetRotation.z = this.isReversed ? Math.PI : 0;
        this.targetScale.set(1.2, 1.2, 1.2); // Optimized for visibility
    }

    private triggerDisintegrate() {
        if (this.state !== GameState.CONFIRMED) return;
        this.setState(GameState.DISINTEGRATING);
        this.createAshes();
        if (this.currentCardMesh) { this.scene.remove(this.currentCardMesh); this.currentCardMesh = null; }
        document.getElementById('reading-panel')?.classList.add('hidden');
        setTimeout(() => {
            if (this.particles) { this.scene.remove(this.particles); this.particles = null; }
            this.setState(GameState.READY);
            
            if (this.sessionDrawnCount >= this.MAX_DRAW_PER_SESSION) {
                const hint = document.getElementById('interaction-hint');
                if (hint) {
                    hint.innerHTML = this.inputMode === InputMode.MOUSE ? "✨ 启示已全，右键开启新的一轮" : "✨ 启示已全，握拳开启新的一轮";
                    hint.classList.remove('opacity-0');
                }
            }
        }, 2500);
    }

    private createAshes() {
        const count = 9000;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        const color = new Float32Array(count * 3);
        const basePos = this.currentCardMesh?.position || new THREE.Vector3(0, 0, 0);
        const currentScale = this.currentCardMesh?.scale.x || 1.2;
        for (let i = 0; i < count; i++) {
            pos[i * 3] = basePos.x + (Math.random() - 0.5) * 2.8 * currentScale;
            pos[i * 3 + 1] = basePos.y + (Math.random() - 0.5) * 4.5 * currentScale;
            pos[i * 3 + 2] = basePos.z;
            vel[i * 3 + 1] = Math.random() * 0.35 + 0.22; 
            vel[i * 3] = (Math.random() - 0.5) * 0.22;    
            color[i * 3] = 1.0;
            color[i * 3 + 1] = 0.85 + Math.random() * 0.15;
            color[i * 3 + 2] = 0.4 + Math.random() * 0.3;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
        this.particles = new THREE.Points(geo, new THREE.PointsMaterial({ vertexColors: true, size: 0.08, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }));
        this.particles.renderOrder = 3000;
        this.scene.add(this.particles);
    }

    private animate() {
        requestAnimationFrame(() => this.animate());
        const time = Date.now() * 0.001;
        if (this.state === GameState.READY && this.cardRing) {
            this.ringVelocity *= 0.94;
            this.ringRotationY += this.ringVelocity + 0.001; 
            this.cardRing.rotation.y = this.ringRotationY;
            
            this.cardRing.children.forEach((child, idx) => {
                child.position.y = Math.sin(time * 0.5 + idx * 0.3) * 0.12;
            });
        }
        if (this.fireflies) {
            const pos = this.fireflies.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < pos.length / 3; i++) {
                pos[i * 3 + 1] += Math.sin(time * 0.8 + i) * 0.005;
                pos[i * 3] += Math.cos(time * 0.4 + i) * 0.005;
                pos[i * 3 + 2] += Math.sin(time * 0.3 + i * 0.5) * 0.005;
            }
            this.fireflies.geometry.attributes.position.needsUpdate = true;
        }
        if (this.currentCardMesh) this.updateCardTransform();
        if (this.state === GameState.DISINTEGRATING && this.particles) {
            const posAttr = (this.particles.geometry as THREE.BufferGeometry).attributes.position;
            const pos = posAttr.array as Float32Array;
            const vel = (this.particles.geometry as any).attributes.velocity.array;
            for(let i=0; i<pos.length/3; i++){ 
                pos[i*3+1] += vel[i*3+1]; 
                pos[i*3] += vel[i*3] + Math.sin(time * 15 + i) * 0.06; 
            }
            posAttr.needsUpdate = true;
            (this.particles.material as THREE.PointsMaterial).opacity -= 0.005;
        }
        this.renderer.render(this.scene, this.camera);
        this.updateDebugOverlay();
    }

    private updateCardTransform() {
        if (!this.currentCardMesh) return;
        const camForward = new THREE.Vector3();
        this.camera.getWorldDirection(camForward);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

        switch (this.state) {
            case GameState.GRABBING:
                if (this.currentCardMesh.position.distanceTo(this.previewAnchor) < 3.5) this.setState(GameState.PREVIEW);
                break;
            case GameState.PREVIEW:
                this.targetPosition.copy(this.previewAnchor);
                this.targetRotation.x = Math.sin(Date.now() * 0.001) * 0.1; 
                this.targetScale.set(1, 1, 1);
                break;
            case GameState.CONFIRMED:
                this.resolveConfirmedSafety(camForward, camUp);
                this.targetRotation.x = (this.isReversed ? Math.PI : 0) + Math.sin(Date.now() * 0.001) * 0.05;
                break;
        }
        
        this.currentCardMesh.position.lerp(this.targetPosition, this.lerpSpeed);
        this.currentCardMesh.rotation.x = THREE.MathUtils.lerp(this.currentCardMesh.rotation.x, this.targetRotation.x, this.lerpSpeed);
        this.currentCardMesh.rotation.y = THREE.MathUtils.lerp(this.currentCardMesh.rotation.y, this.targetRotation.y, this.lerpSpeed);
        this.currentCardMesh.rotation.z = THREE.MathUtils.lerp(this.currentCardMesh.rotation.z, this.targetRotation.z, this.lerpSpeed);
        this.currentCardMesh.scale.lerp(this.targetScale, this.lerpSpeed);
    }

    private resolveConfirmedSafety(camForward: THREE.Vector3, camUp: THREE.Vector3) {
        let dist = this.safetyConfig.baseConfirmDistance;
        let pos = new THREE.Vector3();
        let pushCount = 0;
        let intersected = true;

        while (intersected && pushCount < 40) {
            pos.copy(this.camera.position)
               .addScaledVector(camForward, dist)
               .addScaledVector(camUp, this.safetyConfig.yOffset);
            
            intersected = this.checkIntersectionWithCarousel(pos);
            
            const minSafeDist = this.camera.near + this.safetyConfig.nearMargin;
            if (dist <= minSafeDist) {
                dist = minSafeDist;
                intersected = false; 
            }

            if (intersected) {
                dist -= this.safetyConfig.pushOutStep; 
                pushCount++;
            }
        }

        this.targetPosition.copy(pos);
        this.debugInfo.pushCount = pushCount;
        this.debugInfo.intersected = intersected;
        this.debugInfo.actualDist = dist;
    }

    private checkIntersectionWithCarousel(pos: THREE.Vector3): boolean {
        const distFromCarouselPivot = pos.distanceTo(new THREE.Vector3(0, 0, this.ringCenterZ));
        const isNearArc = Math.abs(distFromCarouselPivot - this.ringRadius) < this.safetyConfig.safetyMargin;
        const isNearHorizon = Math.abs(pos.y) < 2.0;

        return isNearArc && isNearHorizon;
    }

    private updateDebugOverlay() {
        const dbg = document.getElementById('debug-stats');
        if (!dbg) return;
        dbg.innerHTML = `
            Near: ${this.debugInfo.near.toFixed(2)} | 
            Card Dist: ${this.debugInfo.actualDist.toFixed(2)}<br/>
            Safe: ${this.debugInfo.intersected ? '<span class="text-red-500">INTERSECT</span>' : '<span class="text-emerald-500">CLEAN</span>'}
        `;
    }

    private setState(s: GameState) { 
        this.state = s; 
        const hint = document.getElementById('interaction-hint');
        if (hint) {
            hint.classList.remove('opacity-0');
            const isMouse = this.inputMode === InputMode.MOUSE;
            switch(s) {
                case GameState.READY: 
                    if (this.sessionDrawnCount >= this.MAX_DRAW_PER_SESSION) {
                        hint.innerHTML = isMouse ? "✨ 启示已全，右键开启新的一轮" : "✨ 启示已全，握拳开启新的一轮";
                    } else {
                        hint.innerHTML = "";
                    }
                    break;
                case GameState.GRABBING: hint.innerHTML = "✨ 感悟命运之流"; break;
                case GameState.PREVIEW: hint.innerHTML = isMouse ? "🖱️ 右键开启真谛" : "✊ 握拳开启真谛"; break;
                case GameState.CONFIRMED: hint.innerHTML = isMouse ? "🖱️ 再次右键回归宁静" : "✊ 再次握拳回归宁静"; break;
                default: hint.classList.add('opacity-0');
            }
        }
    }

    private resetDeck() {
        this.deck = [...TAROT_DECK]; 
        this.shuffleDeck(); // Randomize on every reset
        this.history = []; 
        this.sessionDrawnCount = 0;
        this.createCardRing();
        if (this.currentCardMesh) this.scene.remove(this.currentCardMesh);
        this.currentCardMesh = null; 
        this.setState(GameState.READY);
        this.updateDeckCount(); 
        this.updateHistoryUI();
    }

    private setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        const onPointerMove = (x: number, y: number) => {
            if (this.inputMode === InputMode.MOUSE) {
                const currentX = (x / window.innerWidth) * 2 - 1;
                const currentY = -(y / window.innerHeight) * 2 + 1;
                if (this.state === GameState.READY) {
                    const dx = currentX - this.mouse.x;
                    this.ringVelocity = dx * 1.2;
                    this.checkHover();
                }
                this.mouse.x = currentX;
                this.mouse.y = currentY;
            }
        };

        window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
        
        window.addEventListener('mousedown', (e) => {
            if (this.inputMode === InputMode.MOUSE) {
                if (e.button === 0) {
                    // Check if clicked the current confirming card
                    if (this.state === GameState.CONFIRMED || this.state === GameState.PREVIEW) {
                        this.raycaster.setFromCamera(this.mouse, this.camera);
                        const intersects = this.raycaster.intersectObjects(this.currentCardMesh!.children);
                        if (intersects.length > 0) {
                            this.showCurrentCardDetail();
                            return;
                        }
                    }
                    this.handleGestureUpdate(Gesture.PINCH);
                }
                if (e.button === 2) this.handleGestureUpdate(Gesture.FIST);
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.inputMode === InputMode.MOUSE) this.handleGestureUpdate(Gesture.NONE);
        });

        window.addEventListener('contextmenu', e => e.preventDefault());
    }

    private updateUIMode(text: string) { document.getElementById('mode-status')!.innerText = text; }
    private updateDeckCount() { 
        const el = document.getElementById('deck-count');
        if (el) el.innerText = `${this.sessionDrawnCount}/${this.MAX_DRAW_PER_SESSION}`; 
    }
    private updateUIBadges(gesture: Gesture) {
        Object.values(Gesture).forEach(g => {
            const el = document.getElementById(`badge-${g}`);
            if (el) el.className = `gesture-badge ${g === gesture ? 'gesture-active' : 'gesture-inactive'}`;
        });
    }

    private showReadingUI() {
        const panel = document.getElementById('reading-panel');
        const name = document.getElementById('card-name');
        const orientation = document.getElementById('card-orientation');
        const meaning = document.getElementById('card-meaning');
        if (panel && name && orientation && meaning && this.activeCardData) {
            panel.classList.remove('hidden');
            name.innerText = `${this.activeCardData.name_zh}`;
            orientation.innerText = this.isReversed ? "逆位" : "正位";
            orientation.className = this.isReversed ? "text-xs font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full bg-red-900/50 text-red-100 border border-red-500/30" : "text-xs font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full bg-indigo-900/50 text-indigo-100 border border-indigo-500/20 shadow-inner";
            meaning.innerText = this.isReversed ? this.activeCardData.meanings.reversed : this.activeCardData.meanings.upright;
        }
    }

    public showCurrentCardDetail() {
        if (this.activeCardData) {
            this.showDetailModal(this.activeCardData, this.isReversed);
        }
    }

    public showHistoryItemDetail(index: number) {
        const item = this.history[index];
        if (item) {
            this.showDetailModal(item.cardData, item.isReversed);
        }
    }

    private currentDetailCard: TarotCardData | null = null;
    private currentDetailReversed: boolean = false;

    private showDetailModal(data: TarotCardData, isReversed: boolean) {
        this.currentDetailCard = data;
        this.currentDetailReversed = isReversed;
        
        const modal = document.getElementById('detail-modal');
        const img = document.getElementById('modal-card-img') as HTMLImageElement;
        const name = document.getElementById('modal-card-name');
        const nameEn = document.getElementById('modal-card-name-en');
        const orientation = document.getElementById('modal-card-orientation');
        const meaning = document.getElementById('modal-card-meaning');

        if (modal && img && name && nameEn && orientation && meaning) {
            img.src = data.generatedImageUrl || data.imageUrl;
            img.style.transform = isReversed ? 'rotate(180deg)' : 'none';
            name.innerText = data.name_zh;
            nameEn.innerText = data.name_en;
            orientation.innerText = isReversed ? "逆位" : "正位";
            orientation.className = isReversed 
                ? "text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-500/20"
                : "text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-indigo-900/30 text-indigo-300 border border-indigo-500/20";
            meaning.innerText = isReversed ? data.meanings.reversed : data.meanings.upright;
            
            // Show areas
            document.getElementById('manifest-area')!.classList.toggle('hidden', !!data.generatedImageUrl);
            document.getElementById('edit-area')!.classList.toggle('hidden', !data.generatedImageUrl);
            
            modal.classList.add('active');
            modal.classList.add('group');
        }
    }

    public async manifestActiveCard() {
        if (!this.currentDetailCard) return;
        const btn = document.getElementById('manifest-btn') as HTMLButtonElement;
        const sizeSelect = document.getElementById('manifest-size') as HTMLSelectElement;
        const size = sizeSelect.value as ImageSize;
        
        btn.disabled = true;
        btn.innerText = "正在显化宇宙能量...";

        try {
            const url = await GenAIService.generateCardArt(this.currentDetailCard, this.currentDetailReversed, size);
            this.updateCardImage(url);
            document.getElementById('manifest-area')!.classList.add('hidden');
            document.getElementById('edit-area')!.classList.remove('hidden');
        } catch (e) {
            console.error(e);
            btn.innerText = "显化受阻，重试?";
        } finally {
            btn.disabled = false;
        }
    }

    public async editActiveCard() {
        if (!this.currentDetailCard || !this.currentDetailCard.generatedImageUrl) return;
        const btn = document.getElementById('edit-btn') as HTMLButtonElement;
        const input = document.getElementById('edit-prompt') as HTMLInputElement;
        const prompt = input.value.trim();
        if (!prompt) return;

        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "...";

        try {
            const url = await GenAIService.editCardArt(this.currentDetailCard.generatedImageUrl, prompt);
            this.updateCardImage(url);
            input.value = "";
        } catch (e) {
            console.error(e);
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }

    private updateCardImage(url: string) {
        if (!this.currentDetailCard) return;
        this.currentDetailCard.generatedImageUrl = url;
        const img = document.getElementById('modal-card-img') as HTMLImageElement;
        if (img) img.src = url;
        
        // Update 3D card if it's the active one
        if (this.activeCardData && this.activeCardData.id === this.currentDetailCard.id) {
            this.activeCardData.generatedImageUrl = url;
            this.createCardMesh(this.activeCardData);
        }
        
        // Sync history
        const hist = this.history.find(h => h.cardData.id === this.currentDetailCard!.id);
        if (hist) hist.cardData.generatedImageUrl = url;
    }

    private updateHistoryUI() {
        const list = document.getElementById('history-list'); if (!list) return;
        if (this.history.length === 0) { 
            list.innerHTML = `<div class="text-[9px] text-gray-500 text-center py-2 tracking-widest italic font-bold">无记录</div>`; 
            return; 
        }
        list.innerHTML = this.history.map((h, i) => `
            <div onclick="showHistoryDetail(${i})" class="group/item flex justify-between items-center text-[10px] bg-indigo-950/30 p-2 rounded-xl border border-white/5 shadow-inner cursor-pointer hover:bg-indigo-900/40 transition-all hover:scale-[1.02] active:scale-95">
                <span class="${h.isReversed ? 'text-red-300' : 'text-indigo-200'} font-bold">${h.name}</span>
                <span class="opacity-30 group-hover/item:opacity-80 transition-opacity text-[8px]">${h.isReversed ? '逆' : '正'}</span>
            </div>
        `).slice(0, 5).join('');
    }
}
