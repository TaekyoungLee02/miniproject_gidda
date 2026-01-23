/**
 * [형식 변환 전용 함수] 
 * 사진 배열 데이터를 LLM이 분석하기 좋은 텍스트 형식으로 변환합니다.
 */
export const formatPhotosForLLM = (photos: any[]): string => {
  // 1. 최대 50개로 제한하여 컨텍스트 최적화
  const targetPhotos = photos.slice(0, 50);

  // 2. 객체 데이터를 AI 친화적인 문자열 포맷으로 변환
  return targetPhotos
    .map((p) => {
      const date = p.capturedAt 
        ? new Date(p.capturedAt * 1000).toLocaleDateString() 
        : "날짜 미상";
      
      // AI가 각 항목을 명확히 구분할 수 있도록 포맷팅
      return `[ID:${p.id}] [태그:${p.aiTags || '정보없음'}] [촬영일:${date}]`;
    })
    .join("\n"); 
};