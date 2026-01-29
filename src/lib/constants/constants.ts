import imgEncoderPath from '@/assets/models/img_encoder/img_encoder.onnx'
import txtEncoderPath from '@/assets/models/txt_encoder/mobileclip_text_fixed.onnx'
import txtEncoderDataPath from '@/assets/models/txt_encoder/mobileclip_text_fixed.onnx.data'
import txtTokenizerPath from '@/assets/models/txt_encoder/txt_tokenizer/txt_tokenizer.onnx'

export const PAD_SIZE : number = 77;

export const imgEncoder : string = 'img_encoder.onnx';
export const txtEncoder : string = 'mobileclip_text_fixed.onnx';
export const txtEncoderData : string = 'mobileclip_text_fixed.onnx.data';
export const txtTokenizer : string = 'txt_tokenizer.onnx';

export const MODEL_MODULES = {
    "img_encoder.onnx": imgEncoderPath,
    "mobileclip_text_fixed.onnx": txtEncoderPath,
    "mobileclip_text_fixed.onnx.data": txtEncoderDataPath,
    "txt_tokenizer.onnx": txtTokenizerPath,
} as const;

export const IMG_HEIGHT_WIDTH : number = 256;
export const IMG_SIZE_HALF : number = 128;
export const IMG_COLOR_SIZE : number = 65536;
export const IMG_BUFFER_SIZE : number = 196608;

export const DATABASE_NAME : string = 'photos.db';

export const DISTANCE_THRESHOLD : number = 0.84
export const DISTANCE_THRESHOLD_SPACE : number = 0.9

/**
 * 앱 시작 시 화면에 띄워줄 예시 검색어들입니다.
 * 이 문구와 어울리는 사진들을 DB에서 뽑아 보여주면 됩니다.
 */
export const INTRO_EXAMPLE_QUERIES = [
    "작년 여름 제주도에서 찍은 바다 사진",
    "우리 집 강아지랑 산책하던 날",
    "친구들이랑 생일 파티했던 기록",
    "맛있는 디저트 먹으러 갔던 카페",
    "밤하늘 별이 쏟아지던 캠핑장",
    "작년 크리스마스 가족 모임"
];

export const SEARCH_INTENT_PROMPT = (currentDate: string) => `
You are the search-intent analysis engine for the gallery search service “GIDDA.”
Based on the current date and time (${currentDate}), convert the user’s ambiguous request into precise search data.

Archival content allowed: KakaoTalk chat screenshots, contracts, ID cards, receipts, sheet music, Karrot Market photos, blurry photos—anything that could exist in a gallery is a valid search target.

[Entities: Keyword Extraction Rules]
Extract keywords according to each type, following these rules:

Core principle: Extract mainly nouns that help with search. Unnecessary verbs should be nominalized or excluded.

0 (Context)
Objects, activities, photo conditions (blur, darkness), app names (KakaoTalk, Instagram, Karrot Market)

(Filtering): Exclude words like “photo,” “taken,” “show,” “there,” “thing,” “captured,” etc.

(Nominalization examples):

“ate” → “food”

“partied” → “party”

“shaken” → “blur”

“quiet” → “quietness”

1 (Time)
Convert relative time expressions mathematically based on ${currentDate}.

If the current date is 2026-01, then “last month” must be 2025-12 (not 2023!).

“The year before last” must be converted to 2024.

2 (Space)
Specific place names.

[Weights: Weight Allocation]
The total weight of Context + Time + Space must equal 1.00.

* English translation
- all of the text in exporting json should be translated in english.

[export JSON like this]
{
  "entities": { "0": ["your keyword"], "1": ["your keyword"], "2": ["your keyword"] },
  "weights": { "0": 0.0, "1": 0.0, "2": 0.0 },
  "reason": "explain your reason to output"
}
`;

// 백지연: 고도화 시 기능 추천합니다.
// 이제 앨범 저장 버튼을 눌렀을 때 GPT가 앨범 제목을 자동으로 지어주는 기능을 만들어보는 건 어떨까요?
// 사용자가 고른 사진들의 태그 정보를 GPT에게 던져주고,
// **"이 사진들에 어울리는 감성적인 앨범 제목 3개만 추천해줘"**라고 시키는 거죠!

export const ALBUM_TITLE_PROMPT = `
당신은 사진 앨범의 제목을 지어주는 감성적인 카피라이터입니다.
제시된 사진들의 태그와 장소 정보를 분석하여, 전체를 아우르는 예쁜 앨범 제목을 지어주세요.

[조건]
1. 제목은 너무 길지 않게 (15자 이내).
2. 감성적인 스타일, 직관적인 스타일, 위트 있는 스타일로 총 3개를 제안하세요.
3. 반드시 아래 JSON 형식으로만 답변하세요.

[출력 형식]
{
  "titles": ["제목1", "제목2", "제목3"]
}
`;

export const TAG_SEARCH_PROMPT_SYSTEM = `
너는 지리 및 도시 환경 전문가(Geospatial Expert)야.
제공된 시각적 환경 키워드들을 분석하여, 이 사진이 촬영되었을 법한 가장 구체적인 '동네 이름' 또는 '지역명'을 추론해줘.
만약 특정 지역을 단정하기 어렵다면, 특징적인 지형이나 구역 유형(예: 강남역 인근 상업지구, 북한산 등산로 초입)으로 답변해줘.
반드시 아래 JSON 형식으로만 답변해줘.

[JSON 출력 형식]
{
  "address": "지역명"
}
`;

export const TAG_SEARCH_PROMPT_USER = `
다음 환경 키워드들이 추출된 사진은 어느 지역에서 찍힌 것일까?
`

export const PROXY_URL = process.env.EXPO_PUBLIC_API_URL;