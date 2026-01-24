// src/types/index.ts

/**
 * [Photo 인터페이스]
 * DB 스키마 및 앱 전반에서 사용하는 메인 데이터 구조
 */
export interface Photo {
  id: string;             // Expo ID (asset ID)
  local_uri: string;      // 폰 내부 파일 경로 (file://...)
  captured_at: number;    // 촬영 시간 (Unix Timestamp)
  width: number;          // 이미지 너비
  height: number;         // 이미지 높이
  
  // --- 분석 정보 (Nullable) ---
  latitude: number | null;   // 위도
  longitude: number | null;  // 경도
  address: string | null;    // 역지오코딩 된 주소
  
  // --- AI 데이터 ---
  ai_tags: string | null;    // MobileCLIP/MobileNet 태그 (콤마로 구분)
  
  // 중요: 벡터는 DB 내부의 vec0 테이블에 저장되므로
  // 일반적인 조회 시에는 이 필드가 비어있을 수 있음.
  embedding?: number[];      
}

/**
 * [검색 결과 인터페이스]
 * SQLite 벡터 검색 결과 (distance 값을 포함)
 */
export interface SearchResult extends Photo {
  distance: number; // 코사인 거리 (0에 가까울수록 유사함)
}