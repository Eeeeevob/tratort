
export enum GameState {
    IDLE = 'IDLE',
    READY = 'READY',
    GRABBING = 'GRABBING',
    PREVIEW = 'PREVIEW',
    CONFIRMED = 'CONFIRMED',
    DISINTEGRATING = 'DISINTEGRATING'
}

export enum InputMode {
    HANDS = 'HANDS',
    MOUSE = 'MOUSE'
}

export enum Gesture {
    NONE = 'NONE',
    OPEN = 'OPEN',
    PINCH = 'PINCH',
    FIST = 'FIST',
    POINT = 'POINT'
}

export type ImageSize = '1K' | '2K' | '4K';

export interface TarotCardData {
    id: number;
    name_zh: string;
    name_en: string;
    meanings: {
        upright: string;
        reversed: string;
    };
    imageUrl: string;
    generatedImageUrl?: string; // Stores the unique AI version or edited version
}

export interface CardHistory {
    name: string;
    isReversed: boolean;
    timestamp: number;
    cardData: TarotCardData;
}
