
import { GoogleGenAI } from "@google/genai";
import { TarotCardData, ImageSize } from "../types";

export class GenAIService {
    private static async ensureApiKey() {
        if (typeof window.aistudio !== 'undefined') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
            }
        }
    }

    private static async urlToBase64(url: string): Promise<{ data: string, mimeType: string }> {
        if (url.startsWith('data:')) {
            const [header, data] = url.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            return { data, mimeType };
        }
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ data: base64, mimeType: blob.type });
            };
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Generate high-quality unique card art using gemini-3-pro-image-preview.
     */
    static async generateCardArt(card: TarotCardData, isReversed: boolean, size: ImageSize): Promise<string> {
        await this.ensureApiKey();
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const orientation = isReversed ? "reversed (upside down)" : "upright";
        const prompt = `A mystical, high-fidelity artistic illustration for the Tarot card "${card.name_en}". 
        Style: ethereal, celestial, Zen Tarot, glowing cosmic energy, symbolic. 
        Position: ${orientation}. No text. High detail.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ text: prompt }] },
                config: {
                    imageConfig: {
                        aspectRatio: "1:1",
                        imageSize: size
                    }
                },
            });

            for (const part of (response as any).candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image in response");
        } catch (error: any) {
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Edit existing card art using gemini-2.5-flash-image based on user prompt.
     */
    static async editCardArt(currentImageUrl: string, userPrompt: string): Promise<string> {
        await this.ensureApiKey();
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const { data, mimeType } = await this.urlToBase64(currentImageUrl);

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data, mimeType } },
                        { text: userPrompt }
                    ]
                }
            });

            for (const part of (response as any).candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("Editing failed: No image returned");
        } catch (error: any) {
            this.handleError(error);
            throw error;
        }
    }

    private static handleError(error: any) {
        const msg = error.message || "";
        if (msg.includes("403") || msg.includes("permission") || msg.includes("not found")) {
            if (window.aistudio) window.aistudio.openSelectKey();
        }
    }
}
