import { SearchType } from '../enums/enums';

export interface SearchAnalysisResult {
  suitability: boolean;   // 검색 적합성 (false면 검색 안 함)
  // keywords: string[];    // 전체 핵심 키워드
  entities: {            // SearchType별로 뽑아낸 구체적 텍스트 데이터
    [key in SearchType]?: string[];
  };
  weights: {             // Enum 기준 가중치
    [key in SearchType]?: number; 
  };
  reason: string;
}