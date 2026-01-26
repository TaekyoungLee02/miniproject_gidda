import { Photo } from '../types';
import axios from 'axios';

/**
 * 🕵️‍♂️ DB의 태그와 메타데이터를 보고 '장소(관광지)'를 추리하는 함수
 * * @param photo 분석할 사진 객체 (ai_tags가 반드시 포함되어야 함)
 */

// ✅ [변경점 1] Azure 키 대신 Firebase Proxy 주소를 가져옴
const PROXY_URL = process.env.EXPO_PUBLIC_API_URL;

// 디버깅용 로그 (앱 켤 때 한 번만 확인)
console.log("🚀 [Azure Proxy] URL Check:", PROXY_URL ? "✅ Connected" : "❌ Missing URL");

// 반환값 타입을 정의해주면 자동완성이 잘 돼서 편함
interface LocationResult {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * 📍 태그 기반 위치 추론 함수
 * - 앱은 키를 모름. Firebase Proxy에 "이 태그들로 위치 좀 맞춰봐"라고 메시지만 보냄.
 */
export const identifyLocationFromTags = async (photo: Photo): Promise<LocationResult | null> => {
  //  방어 코드: 태그가 아예 없으면 GPT에게 물어볼 필요가 없음 (비용 절약)
  if (!photo.ai_tags || photo.ai_tags.trim() === '') {
    console.log(`⚠️ [Azure] ID(${photo.id})는 분석할 태그(ai_tags)가 없습니다. 스킵.`);
    return null;
  }

  try {
    // ✅ [변경점 2] 필수 환경변수 체크 (Proxy URL만 있으면 됨)
    if (!PROXY_URL) {
      throw new Error('❌ .env에 EXPO_PUBLIC_API_URL이 없습니다. 앱을 껐다 켜주세요.');
    }
    
    console.log(`🧠 [Azure] 장소 추리 요청 시작... (ID: ${photo.id})`);
    
    const dateStr = new Date(photo.captured_at).toLocaleString();
    
    const locationHint = (photo.latitude && photo.longitude) 
      ? `(참고 GPS: 위도 ${photo.latitude}, 경도 ${photo.longitude})` 
      : '(GPS 정보 없음)';

    // // 테스트용 태그 (아직 DB에 태그가 없으므로)
    // const detectedTags = '화산, 돌담, 바다, 해, 귤, 석상, 제주도';

    // 3. 🆕 [핵심 변경] 실제 DB에 저장된 태그 사용
    // DB에는 "sea, sky, rock" 처럼 저장되어 있을 수 있음.
    const detectedTags = photo.ai_tags;

    const userPrompt = `
      나는 여행 사진의 위치를 찾고 있어. 아래 정보를 단서로 여기가 어디인지 추리해줘.
      
      [정보]
      - 시각적 특징(Tags): ${detectedTags}
      - 촬영 날짜: ${dateStr}
      - 위치 힌트: ${locationHint}
      
      [요청사항]
      - 위 태그들을 조합했을 때 한국(또는 사용자가 자주 가는 해외 여행지) 내에서 가장 유력한 '구체적인 장소명' 하나만 말해줘.
      - 만약 도저히 모르겠으면 'unknown'라고만 답해.
      - 그 장소의 대표적인 위도(latitude)와 경도(longitude) 좌표를 추정해.
      - 답변은 모두 영어 소문자로만 구성해.
      - **반드시 아래 JSON 포맷으로만 답변해.** (다른 말 금지)

      {
        "name": "장소명 (예: jeju seongsan ilchulbong)",
        "latitude": 33.458,
        "longitude": 126.942
      }
    `;

    // const payload = {
    //   messages: [
    //     {
    //       role: 'system',
    //       content: '당신은 사진의 메타데이터와 태그를 분석하여 촬영 장소를 정확히 맞추는 AI 탐정입니다.',
    //     },
    //     {
    //       role: 'user',
    //       content: userPrompt,
    //     },
    //   ],
    //   max_tokens: 200, // JSON이 잘리지 않도록 조금 넉넉하게 50 -> 200으로 늘림
    //   temperature: 0.3, // 창의성보다는 정확도 중시
    // };

    // ✅ [변경점 3] 요청 페이로드 수정
    // Proxy 서버는 'messages' 배열만 받아서 Azure로 전달함.
    // (temperature 등은 서버 코드에 설정되어 있으므로 생략 가능)
    const payload = {
      messages: [
        {
          role: 'system',
          content: '당신은 사진의 메타데이터와 태그를 분석하여 촬영 장소를 정확히 맞추는 AI 탐정입니다.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ]
    };

    // ✅ [변경점 4] Axios를 사용하여 Proxy로 POST 요청
    // (api-key 헤더 제거됨 -> 서버가 처리함)
    const response = await axios.post(PROXY_URL, payload);

   if (!response.ok) {
      const errData = await response.json();
      console.error('❌ [Azure] API 호출 오류:', errData);
      throw new Error(`Azure API Error: ${response.status}`);
    }

    // Axios는 response.data가 이미 JSON 객체임
    const data = await response.json();
    // Azure 응답 구조 파싱 (choices[0].message.content)
    const inferredLocation = data.choices[0]?.message?.content?.trim();

    if (!inferredLocation) {
        throw new Error("Azure 응답이 비어있습니다.");
    }

    // 🆕 JSON 파싱 (문자열 -> 객체 변환)
    // 가끔 GPT가 ```json ... ``` 같은 마크다운을 붙일 때가 있어서 제거 처리
    const cleanJson = inferredLocation.replace(/```json|```/g, '').trim();
    
    // 파싱 시도
    let result: LocationResult;
    try {
        result = JSON.parse(cleanJson);
    } catch (e) {
        console.error("JSON 파싱 실패. 원본 응답:", cleanJson);
        return null;
    }

    // unknown 처리
    if (result.name === 'unknown') {
        console.log(`🤷‍♂️ [Azure] 위치 특정 실패 (unknown)`);
        return null;
    }

    console.log(`🧠 [Azure] 추론 성공: ${result.name} (${result.latitude}, ${result.longitude})`);
    return result;

  } catch (error: any) {
    console.error('❌ [Azure Proxy] 위치 추론 중 에러 발생:', error.message || error);
    if (error.response) {
        console.error("Server Response:", error.response.data);
    }
    return null;
  }
};