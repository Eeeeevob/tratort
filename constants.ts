
import { TarotCardData } from './types';

// Using public domain high-quality Rider-Waite-Smith assets
const BASE_IMG_URL = "https://raw.githubusercontent.com/Aris-Tottle/Tarot-API/master/static/cards/";

export const TAROT_DECK: TarotCardData[] = [
    // Major Arcana
    { id: 0, name_zh: "愚者", name_en: "The Fool", meanings: { upright: "新起点、纯真、自发性、自由灵性。", reversed: "鲁莽、冒险、疏忽、愚蠢。" }, imageUrl: BASE_IMG_URL + "m00.jpg" },
    { id: 1, name_zh: "魔术师", name_en: "The Magician", meanings: { upright: "意志力、创造力、技能、显现、资源。", reversed: "操纵、规划不周、未开发的 talents。" }, imageUrl: BASE_IMG_URL + "m01.jpg" },
    { id: 2, name_zh: "女祭司", name_en: "The High Priestess", meanings: { upright: "直觉、神秘、潜意识、神圣的女性特质。", reversed: "秘密暴露、脱离直觉、肤浅、沉默。" }, imageUrl: BASE_IMG_URL + "m02.jpg" },
    { id: 3, name_zh: "皇后", name_en: "The Empress", meanings: { upright: "丰饶、自然、感官享受、母性、创造力。", reversed: "创意阻碍、过度依赖他人、失去自我。" }, imageUrl: BASE_IMG_URL + "m03.jpg" },
    { id: 4, name_zh: "皇帝", name_en: "The Emperor", meanings: { upright: "权威、结构、秩序、父亲形象、稳定性。", reversed: "暴政、过度控制、僵化、缺乏纪律。" }, imageUrl: BASE_IMG_URL + "m04.jpg" },
    { id: 5, name_zh: "教皇", name_en: "The Hierophant", meanings: { upright: "传统、社会规范、精神智慧、信仰。", reversed: "叛逆、打破陈规、新颖、个人信仰。" }, imageUrl: BASE_IMG_URL + "m05.jpg" },
    { id: 6, name_zh: "恋人", name_en: "The Lovers", meanings: { upright: "爱、和谐、关系、价值观、重大选择。", reversed: "失衡、不和、逃避责任、不合拍。" }, imageUrl: BASE_IMG_URL + "m06.jpg" },
    { id: 7, name_zh: "战车", name_en: "The Chariot", meanings: { upright: "控制、意志力、成功、决心、胜利。", reversed: "失控、侵略性、方向感缺失、强制力。" }, imageUrl: BASE_IMG_URL + "m07.jpg" },
    { id: 8, name_zh: "力量", name_en: "Strength", meanings: { upright: "勇气、耐性、内心力量、罗盘。", reversed: "软弱、自我怀疑、易怒、失衡。" }, imageUrl: BASE_IMG_URL + "m08.jpg" },
    { id: 9, name_zh: "隐士", name_en: "The Hermit", meanings: { upright: "内省、孤独、寻求真理、精神指引。", reversed: "隔离、寂寞、偏执、与社会脱节。" }, imageUrl: BASE_IMG_URL + "m09.jpg" },
    { id: 10, name_zh: "命运之轮", name_en: "Wheel of Fortune", meanings: { upright: "好运、轮回、转折点、必然。", reversed: "坏运气、阻力、无法打破的循环。" }, imageUrl: BASE_IMG_URL + "m10.jpg" },
    { id: 11, name_zh: "正义", name_en: "Justice", meanings: { upright: "公平、真理、法律、因果。", reversed: "不公、逃避真相、不诚实。" }, imageUrl: BASE_IMG_URL + "m11.jpg" },
    { id: 12, name_zh: "悬吊者", name_en: "The Hanged Man", meanings: { upright: "暂停、牺牲、换位思考、释放。", reversed: "停滞不前、无谓的牺牲、逃避。" }, imageUrl: BASE_IMG_URL + "m12.jpg" },
    { id: 13, name_zh: "死神", name_en: "Death", meanings: { upright: "终结、转型、过渡、放手。", reversed: "抗拒改变、恐惧终结、沉迷过去。" }, imageUrl: BASE_IMG_URL + "m13.jpg" },
    { id: 14, name_zh: "节制", name_en: "Temperance", meanings: { upright: "平衡、适度、耐心、融合。", reversed: "失衡、冲突、过度、缺乏目标。" }, imageUrl: BASE_IMG_URL + "m14.jpg" },
    { id: 15, name_zh: "恶魔", name_en: "The Devil", meanings: { upright: "束嘱、成瘾、物质欲望、阴影。", reversed: "解脱、觉醒、重新获得控制、放手。" }, imageUrl: BASE_IMG_URL + "m15.jpg" },
    { id: 16, name_zh: "塔", name_en: "The Tower", meanings: { upright: "剧变、突发灾难、觉醒、瓦解。", reversed: "恐惧改变、推迟必然、小麻烦。" }, imageUrl: BASE_IMG_URL + "m16.jpg" },
    { id: 17, name_zh: "星星", name_en: "The Star", meanings: { upright: "希望、灵感、慷慨、宁静。", reversed: "失望、缺乏信心、焦虑、迷茫。" }, imageUrl: BASE_IMG_URL + "m17.jpg" },
    { id: 18, name_zh: "月亮", name_en: "The Moon", meanings: { upright: "幻想、恐惧、直觉、潜意识。", reversed: "恐惧消除、真相大白、解除混乱。" }, imageUrl: BASE_IMG_URL + "m18.jpg" },
    { id: 19, name_zh: "太阳", name_en: "The Sun", meanings: { upright: "快乐、成功、活力、自信。", reversed: "暂时的不快、过度狂热、挫折。" }, imageUrl: BASE_IMG_URL + "m19.jpg" },
    { id: 20, name_zh: "审判", name_en: "Judgement", meanings: { upright: "觉醒、反省、重生、因果。", reversed: "自我怀疑、拒绝召唤、内疚。" }, imageUrl: BASE_IMG_URL + "m20.jpg" },
    { id: 21, name_zh: "世界", name_en: "The World", meanings: { upright: "圆满、成就、旅行、统合。", reversed: "未完成、延迟、缺乏耐心、停滞。" }, imageUrl: BASE_IMG_URL + "m21.jpg" },
    
    // Minor Arcana - Wands (Sample)
    { id: 22, name_zh: "权杖一", name_en: "Ace of Wands", meanings: { upright: "新的创意、灵感、开始。", reversed: "延迟、缺乏热情。" }, imageUrl: BASE_IMG_URL + "w01.jpg" },
    { id: 23, name_zh: "权杖二", name_en: "Two of Wands", meanings: { upright: "远见、规划、决策。", reversed: "规划不周、恐惧。" }, imageUrl: BASE_IMG_URL + "w02.jpg" },
    { id: 35, name_zh: "权杖侍从", name_en: "Page of Wands", meanings: { upright: "探索、热情、消息。", reversed: "急躁、不成熟。" }, imageUrl: BASE_IMG_URL + "w11.jpg" },
    
    // Minor Arcana - Cups (Sample)
    { id: 36, name_zh: "圣杯一", name_en: "Ace of Cups", meanings: { upright: "爱、情感丰富、直觉。", reversed: "情感抑制、失意。" }, imageUrl: BASE_IMG_URL + "c01.jpg" },
    { id: 49, name_zh: "圣杯侍从", name_en: "Page of Cups", meanings: { upright: "直觉、敏感、艺术。", reversed: "情绪波动、逃避。" }, imageUrl: BASE_IMG_URL + "c11.jpg" },
    
    // Minor Arcana - Swords (Sample)
    { id: 50, name_zh: "宝剑一", name_en: "Ace of Swords", meanings: { upright: "理智、清晰、胜利。", reversed: "混乱、滥用权力。" }, imageUrl: BASE_IMG_URL + "s01.jpg" },
    { id: 63, name_zh: "宝剑侍从", name_en: "Page of Swords", meanings: { upright: "好奇心、敏捷、沟通。", reversed: "多疑、流言蜚语。" }, imageUrl: BASE_IMG_URL + "s11.jpg" },
    
    // Minor Arcana - Pentacles (Sample)
    { id: 64, name_zh: "钱币一", name_en: "Ace of Pentacles", meanings: { upright: "物质财富、机遇、健康。", reversed: "贪婪、机会错失。" }, imageUrl: BASE_IMG_URL + "p01.jpg" },
    { id: 77, name_zh: "钱币侍从", name_en: "Page of Pentacles", meanings: { upright: "务实、野心、学习。", reversed: "缺乏远见、懒惰。" }, imageUrl: BASE_IMG_URL + "p11.jpg" }
];

export const CARD_BACK_URL = "generated:back";
// Further increased PINCH_THRESHOLD for easier activation in mobile/webcam environments
export const PINCH_THRESHOLD = 0.22; 
export const GESTURE_CONFIDENCE = 0.8;
