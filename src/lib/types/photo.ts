// DB 스키마와 1:1 매칭되는 핵심 인터페이스
export interface Photo {
    // [PK] 폰 갤러리 ID
    id: string;

    // [Essential] 필수 데이터
    local_uri: string;      // 파일 경로
    captured_at: number;    // 촬영 시간 (Unix Timestamp)
    width: number;          // UI 배치용 가로
    height: number;         // UI 배치용 세로

    // [Search] 검색용 데이터 (Optional)
    latitude?: number;
    longitude?: number;
    address?: string;

    // [AI] 분석 데이터
    ai_tags?: string[];

    // [Frontend Only] UI 상태값
    score?: number;         // 유사도 점수 (0.0 ~ 1.0)
}

export interface Album {
    id: number;
    title: string;
    summary?: string;
    photo_ids: string[];
    cover_uri?: string;
    created_at: number;
}