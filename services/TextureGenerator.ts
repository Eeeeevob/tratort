
export class TextureGenerator {
    private static width = 512;
    private static height = 800;

    /**
     * Generates a circular emblem card front style based on the provided images.
     */
    static generateCardFront(nameZh: string, nameEn: string, id: number): string {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d')!;

        // 1. Clean White/Cream Card Body
        ctx.fillStyle = '#fdfcf0';
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. Subtle Texture/Paper Grain
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 1000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
            ctx.fillRect(Math.random() * this.width, Math.random() * this.height, 1, 1);
        }
        ctx.globalAlpha = 1.0;

        // 3. Circular Emblem Area
        const centerX = this.width / 2;
        const centerY = this.height * 0.42;
        const radius = 180;

        // Shadow for the circle
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();

        // 4. Labels
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';

        // Card ID
        ctx.font = '300 32px "Times New Roman", serif';
        ctx.fillText(id.toString(), centerX, centerY + radius + 60);

        // Name Chinese
        ctx.font = 'bold 44px "Noto Serif SC", serif';
        ctx.fillText(nameZh, centerX, centerY + radius + 120);

        // Name English
        ctx.font = '300 28px "Times New Roman", serif';
        ctx.fillStyle = '#666';
        ctx.fillText(nameEn, centerX, centerY + radius + 160);

        // 5. Delicate Gilded Border (Inner)
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, this.width - 60, this.height - 60);

        return canvas.toDataURL();
    }

    /**
     * Generates a mysterious "Liquid Gold" (鎏金) card back.
     */
    static generateCardBack(): string {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d')!;

        // 1. Base Gradient - Deep Metallic Bronze to Dark Gold
        const baseGrad = ctx.createLinearGradient(0, 0, this.width, this.height);
        baseGrad.addColorStop(0, '#2b1e00');
        baseGrad.addColorStop(0.5, '#4a3701');
        baseGrad.addColorStop(1, '#1a1400');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. Liquid Gold "Shine" Overlay
        const shineGrad = ctx.createLinearGradient(0, 0, this.width, this.height);
        shineGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
        shineGrad.addColorStop(0.45, 'rgba(255, 215, 0, 0.1)');
        shineGrad.addColorStop(0.5, 'rgba(255, 249, 227, 0.3)');
        shineGrad.addColorStop(0.55, 'rgba(255, 215, 0, 0.1)');
        shineGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.fillStyle = shineGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 3. Ornate Filigree (Liquid Flowing Patterns)
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        
        // Layered circular mandalas for a rich depth
        for (let j = 0; j < 3; j++) {
            ctx.strokeStyle = j === 2 ? '#fff9e3' : '#d4af37';
            ctx.globalAlpha = 0.2 + (j * 0.3);
            ctx.lineWidth = 1 + j * 0.5;
            
            for (let i = 0; i < 16; i++) {
                ctx.rotate(Math.PI / 8);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(
                    80 + j * 20, -150 - j * 30, 
                    250 + j * 40, 150 + j * 20, 
                    0, 350 - j * 50
                );
                ctx.stroke();
            }
        }
        ctx.restore();

        // 4. Heavy Gilded Border with liquid highlights
        const borderGrad = ctx.createLinearGradient(0, 0, this.width, this.height);
        borderGrad.addColorStop(0, '#8B6914');
        borderGrad.addColorStop(0.2, '#FFD700');
        borderGrad.addColorStop(0.5, '#FFF9E3');
        borderGrad.addColorStop(0.8, '#FFD700');
        borderGrad.addColorStop(1, '#8B6914');
        
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 18;
        ctx.strokeRect(20, 20, this.width - 40, this.height - 40);
        
        // Inner thin line for detail
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeRect(40, 40, this.width - 80, this.height - 80);

        // 5. Center Liquid Emblem
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        
        // Glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
        glow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 150, 0, Math.PI * 2);
        ctx.fill();

        // Main Seal
        ctx.fillStyle = borderGrad;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 90, 0, Math.PI * 2);
        ctx.fill();
        
        // Sacred Symbols (Compass)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff9e3';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            ctx.moveTo(0, -70);
            ctx.lineTo(10, 0);
            ctx.lineTo(0, 70);
            ctx.lineTo(-10, 0);
            ctx.closePath();
            ctx.stroke();
        }
        
        ctx.restore();

        return canvas.toDataURL();
    }
}
