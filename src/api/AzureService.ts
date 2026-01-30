import { SEARCH_INTENT_PROMPT, ALBUM_TITLE_PROMPT } from '@/src/lib/constants/constants';
import { SearchAnalysisResult } from '@/src/lib/types/analysis';
import { SearchType } from '../lib/enums/enums';
import axios from "axios";

// 1. Firebase Proxy 서버 주소 (환경변수에서 가져오기)
const PROXY_URL = process.env.EXPO_PUBLIC_API_URL;

export const analyzeUserSearch = async (query: string): Promise<SearchAnalysisResult | null> => {
  try {
    // 검색 시점의 날짜 생성 (예: 2024-05-20 월요일)
    const now = new Date();
    const currentDateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${['일','월','화','수','목','금','토'][now.getDay()]}요일`;

    // 2. client.chat... 대신 axios.post 사용
    const response = await axios.post(PROXY_URL, {
      messages: [
        {
          role: 'system',
          content: SEARCH_INTENT_PROMPT(currentDateStr),
        },
        {
          role: 'user',
          content: query,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // 분석의 일관성을 위해 더 낮춤
    });

    // const response = await client.chat.completions.create({
    //   model: process.env.EXPO_PUBLIC_AZURE_DEPLOYMENT_NAME || "gpt-4o-mini",
    //   messages: [
    //     { role: "system", content: SEARCH_INTENT_PROMPT(currentDateStr) }, // 날짜 주입!
    //     { role: "user", content: query }
    //   ],
    //   response_format: { type: "json_object" },
    //   temperature: 0.1, // 분석의 일관성을 위해 더 낮춤
    // });

    // 3. Axios는 결과를 response.data에 담아줍니다.
    const data = response.data.resp as SearchAnalysisResult;
    console.log(`here~ user query : `, data);

    if (!data) return null;

    return data;
    //
    // return {
    //   entities: {
    //     [SearchType.Context]: data.entities["0"],
    //     [SearchType.Time]: data.entities["1"],
    //     [SearchType.Space]: data.entities["2"],
    //   },
    //   weights: {
    //     [SearchType.Context]: data.entities["0"],
    //     [SearchType.Time]: data.entities["1"],
    //     [SearchType.Space]: data.entities["2"],
    //   },
    //   reason: data.reason
    // };
  } catch (error: any) {
    // 1️⃣ 400 에러: 보안 필터 (오늘 지연 님을 괴롭힌 녀석)
    if (error.status === 400 && error.code === 'content_filter') {
      return {
        suitability: false,
        entities: { [SearchType.Context]: [], [SearchType.Time]: [], [SearchType.Space]: [] },
        weights: { [SearchType.Context]: 0, [SearchType.Time]: 0, [SearchType.Space]: 0 },
        reason: "보안 정책에 의해 검색이 차단되었습니다."
      };
    }

    // 2️⃣ 429 에러: 요청 횟수 초과 (사용자가 너무 빠르게 연타할 때)
    if (error.status === 429) {
      return {
        suitability: false,
        entities: { [SearchType.Context]: [], [SearchType.Time]: [], [SearchType.Space]: [] },
        weights: { [SearchType.Context]: 0, [SearchType.Time]: 0, [SearchType.Space]: 0 },
        reason: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
      };
    }

    // 그 외 (네트워크 끊김 등)
    console.error("❌ 예측하지 못한 에러 발생:", error);
    return null;
  }
};

/**
 * 백지연: 고도화 시 기능 추천합니다.
 * 선택된 사진들의 정보를 바탕으로 AI가 앨범 제목을 추천합니다.
 * @param photoData 사진들의 태그와 날짜 정보가 합쳐진 문자열
 */
export const generateAlbumTitles = async (photoData: string): Promise<string[]> => {
  try {
    // 여기도 axios.post로 교체
    console.log(`rrrrrrrr`, response.data);
    const response = await axios.post(PROXY_URL, {
      messages: [
        { role: "system", content: ALBUM_TITLE_PROMPT },
        { role: "user", content: `다음 사진들에 어울리는 제목을 지어줘:\n${photoData}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8, // 창의적인 제목을 위해 온도를 조금 높입니다!
    });

    console.log(`rrrrrrrr`, response.data);
    const data = response.data;
    const result = data.choices?.[0]?.message?.content;

    if (!result) return ["새 앨범"];

    const parsed = JSON.parse(result);
    return parsed.titles;
  } catch (error) {
    console.error("❌ 앨범 제목 생성 실패:", error);
    return ["나의 앨범"];
  }
};