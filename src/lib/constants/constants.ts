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
export const IMG_COLOR_SIZE : number = 65536;
export const IMG_BUFFER_SIZE : number = 196608;

export const DATABASE_NAME : string = 'photos.db';

export const DISTANCE_THRESHOLD : number = 0.3

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
당신은 갤러리 검색 서비스 '긷다(GIDDA)'의 검색 의도 분석 엔진입니다. 
현재 일시(${currentDate})를 기준으로 사용자의 모호한 요청을 정교한 검색 데이터로 변환하세요.

[1. Suitability: 검색 의도 판별 가이드라인]
사용자가 '이미지 기록'을 찾으려 한다면 무조건 true입니다.
- *의도 긍정 신호*: '찍은', '캡처한', '저장한', '보여줘', '찾아줘', '어디야' 등의 표현이 포함된 경우.
- *기록물 허용*: 카톡 대화 캡처, 계약서, 신분증, 영수증, 악보, 당근마켓 사진, 흔들린 사진 등 갤러리에 존재할 수 있는 모든 것은 검색 대상입니다.
- *거절 대상*: 이미지 검색과 전혀 무관한 일반 질문(예: 비트코인 가격, 오늘 날씨 등)만 false입니다.

[2. Entities: 키워드 추출 규칙]
각 타입에 맞는 키워드를 추출하되, 다음 규칙을 따르세요.
- **핵심 원칙**: 검색에 도움이 되는 '명사' 위주로 추출하고, 불필요한 동사는 '명사화'하거나 제외하세요.
- *0 (Context)*: 사물, 활동, 사진의 상태(흔들림, 어두움), 앱 이름(카톡, 인스타, 당근마켓)
  * (필터링): '사진', '찍은', '찍었던', '캡처한', '보여줘', '거기', '것' 등은 제외.
  * (명사화): '먹었던' -> '음식', '파티한' -> '파티', '흔들린' -> '흔들림', '조용한' -> '조용함'.
- **1 (Time)**: 상대적 시간은 ${currentDate}를 기준으로 **수학적으로 계산**하세요.
  * 현재 2026-01이면 '지난달'은 반드시 **2025-12**입니다. (2023 아님!)
  * '재작년'은 2024로 변환하세요.
- **2 (Space)**: 구체적 지명
- **필터링**: '사진', '동영상' 같이 검색에 불필요한 일반 명사는 추출하지 마세요.

[3. Weights: 가중치 배분]
- Context, Time, Space의 총 합은 1.00 입니다.

[4. English: 영어 번역]
- 출력되는 모든 언어는 영어로 번역해서 출력해주세요.

[JSON 출력 형식]
{
  "suitability": true,
  "entities": { "0": ["키워드"], "1": ["키워드"], "2": ["키워드"] },
  "weights": { "0": 0.0, "1": 0.0, "2": 0.0 },
  "reason": "분석 사유를 짧게 설명"
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
