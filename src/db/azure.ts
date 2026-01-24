import { Photo } from '../types';

/**
 * 🕵️‍♂️ DB의 태그와 메타데이터를 보고 '장소(관광지)'를 추리하는 함수
 * * @param photo 분석할 사진 객체 (ai_tags가 반드시 포함되어야 함)
 */

console.log("ENV CHECK", {
  endpoint: process.env.EXPO_PUBLIC_AZURE_ENDPOINT,
  deployment: process.env.EXPO_PUBLIC_AZURE_DEPLOYMENT,
  apiKey: process.env.EXPO_PUBLIC_AZURE_API_KEY,
});

export const identifyLocationFromTags = async (photo: Photo): Promise<string> => {
  // 1. 방어 코드: 태그가 아예 없으면 GPT에게 물어볼 필요가 없음 (비용 절약)
  if (!photo.ai_tags || photo.ai_tags.trim() === '') {
    console.log(`⚠️ [Azure] ID(${photo.id})는 분석할 태그(ai_tags)가 없습니다. 스킵.`);
    return '';
  }
  
  try {
    // 1. [핵심 수정] 변수 선언을 함수 안으로 이동! (버튼 누를 때 읽기 위함)
    const ENDPOINT = process.env.EXPO_PUBLIC_AZURE_AI_FOUNDRY_ENDPOINT;
    const API_KEY = process.env.EXPO_PUBLIC_AZURE_AI_FOUNDRY_KEY;
    const DEPLOYMENT = process.env.EXPO_PUBLIC_AZURE_DEPLOYMENT_NAME;
    const API_VERSION = process.env.EXPO_PUBLIC_AZURE_OPENAI_API_VERSION;

    // 2. URL 조합 (함수 실행될 때마다 새로 만듦)
    const URL = `${ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

    // 3. [디버깅] 값 확인 로그
    console.log(`🔗 [Azure] 요청 URL: ${URL}`);
    console.log(`🔑 [Azure] API Key 상태: ${API_KEY ? '✅ 있음' : '❌ 없음'}`);

    // 4. 안전장치: 필수 값이 없으면 요청 전에 멈춤
    if (!ENDPOINT || !API_KEY) {
      throw new Error('❌ .env 환경변수가 로드되지 않았습니다. 앱을 껐다 켜주세요.');
    }
    // URL이 'undefined'로 시작하면 차단
    if (URL.includes('undefined')) {
      throw new Error('❌ Endpoint가 undefined입니다. .env 파일의 변수명을 확인하세요.');
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
      - 위 태그들을 조합했을 때 한국(또는 사용자가 자주 가는 곳) 내에서 가장 유력한 '구체적인 장소명' 하나만 말해줘.
      - 만약 도저히 모르겠으면 'unknown'라고만 답해.
      - 설명은 필요 없고 장소 이름만 딱 출력해. (예: 제주 성산일출봉)
      - 답변은 모두 영어 소문자로만 구성해.
    `;

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
      ],
      max_tokens: 50, // 장소명만 받을 것이므로 짧게 설정 (비용 절약)
      temperature: 0.3, // 창의성보다는 정확도 중시
    };

    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY, // Azure는 Authorization 대신 api-key 사용
      },
      body: JSON.stringify(payload),
    });

   if (!response.ok) {
      const errData = await response.json();
      console.error('❌ [Azure] API 호출 오류:', errData);
      throw new Error(`Azure API Error: ${response.status}`);
    }

    const data = await response.json();
    const inferredLocation = data.choices[0]?.message?.content?.trim();

    console.log(`🧠 [Azure] 추론 완료: "${detectedTags}" -> 📍 ${inferredLocation}`);
    return inferredLocation;

  } catch (error) {
    console.error('❌ [Azure] 위치 추론 중 에러 발생:', error);
    return '';
  }
};