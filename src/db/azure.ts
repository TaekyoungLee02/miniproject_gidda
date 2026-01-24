import { Photo } from '../types';

/**
 * 🕵️‍♂️ DB의 태그와 메타데이터를 보고 '장소(관광지)'를 추리하는 함수
 */

console.log("ENV CHECK", {
  endpoint: process.env.EXPO_PUBLIC_AZURE_ENDPOINT,
  deployment: process.env.EXPO_PUBLIC_AZURE_DEPLOYMENT,
  apiKey: process.env.EXPO_PUBLIC_AZURE_API_KEY,
});

export const identifyLocationFromTags = async (photo: Photo): Promise<string> => {
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

    // 테스트용 태그 (아직 DB에 태그가 없으므로)
    const detectedTags = '화산, 돌담, 바다, 해, 귤, 석상, 제주도';

    const userPrompt = `
      내가 가진 사진의 태그 정보를 줄게. 이걸 보고 여기가 어디인지(어떤 관광지인지) 맞춰봐.
      
      [단서]
      1. 태그 목록: ${detectedTags}
      2. 촬영 시간: ${dateStr}
      3. 위치 힌트: ${locationHint}
      
      [요청사항]
      - 위 태그들의 조합으로 보았을 때 가장 가능성이 높은 '장소명'이나 '지역명'을 알려줘.
      - 왜 그렇게 생각했는지 1줄로 짧게 이유도 덧붙여줘.
      - 답변 형식: "이곳은 [장소명]인 것 같습니다. (이유)"
    `;

    const payload = {
      messages: [
        {
          role: 'system',
          content: '당신은 사진의 태그 정보만 보고 촬영 장소와 관광지를 정확하게 유추하는 여행 전문가 AI입니다. 한국어로 답변하세요.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    };

    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY, // Azure는 Authorization 대신 api-key 사용
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [Azure Error]', data);
      throw new Error(data.error?.message || 'Azure API 호출 실패');
    }

    const aiAnswer = data.choices[0].message.content;
    console.log('✅ [Azure] 추리 완료:', aiAnswer);
    return aiAnswer;

  } catch (error) {
    console.error('❌ [Azure] 추리 실패:', error);
    throw error;
  }
};