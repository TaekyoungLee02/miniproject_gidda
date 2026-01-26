import { client } from "@/src/api/AzureFoundry";

export interface SearchWeights {
  content_w: number;
  time_w: number;
  location_w: number;
  reason: string;
}

export const analyzeSearchIntent = async (query: string): Promise<SearchWeights> => {
  const systemPrompt = `
    당신은 사진 갤러리 검색 엔진의 쿼리 분석기입니다. 
    사용자의 검색 문장을 분석하여 [내용, 시간, 공간] 정보의 중요도를 합산 1이 되도록 할당하세요.

    1. 내용(content): 사물, 사람, 행위, 분위기 (예: '강아지', '웃는 모습', '파티')
    2. 시간(time): 특정 날짜, 계절, 시기 (예: '작년', '겨울', '지난주', '2023년')
    3. 공간(location): 특정 장소, 지역, 건물명 (예: '제주도', '강남역', '학교')

    반드시 아래 JSON 형식으로만 답변하세요:
    {
      "content_w": float,
      "time_w": float,
      "location_w": float,
      "reason": "분석 이유를 짧게 설명"
    }
  `;

  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      model: "", 
      response_format: { type: "json_object" }, // JSON 출력을 강제함
    });

    const content = response.choices[0].message.content;
    
    if (!content) throw new Error("응답 내용이 없습니다.");

    // JSON 문자열을 객체로 변환하여 반환
    return JSON.parse(content) as SearchWeights;

  } catch (error) {
    console.error("검색 의도 분석 중 오류 발생:", error);
    // 에러 발생 시 시스템이 멈추지 않도록 기본 가중치 반환 (Fallback)
    return {
      content_w: 0.4,
      time_w: 0.3,
      location_w: 0.3,
      reason: "API 호출 실패로 인한 기본값 설정"
    };
  }
};