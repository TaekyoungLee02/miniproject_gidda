import 'dotenv/config';
import { analyzeUserSearch } from './src/api/AzureService';

const testCases = [
"오운완 기록용 전신 거울 사진"
,"친구랑 카톡 대화 내용 저장한 거",
"지난달 친구 결혼식에서 찍은 단체사진",
"기타 연습하거나 악보 찍어둔 거",
"발레 연습 끝나고 거울 앞에서 찍은 사진",
"집 월세 계약서랑 신분증 찍어둔 거",
"인스타에서 본 맛집 캡처한 화면",
"주차 어디 했는지 위치 찍어둔 사진",
"당근마켓 올리려고 찍은 가구 사진",
"혼자 있고 싶을 때 봤던 조용한 노을",
"그때 거기서 먹었던 거",
"우리 집 강아지 처음 데려왔을 때 사진",
"재작년 크리스마스 때 파티한 사진",
"지금은 없는 옛날 동네 사진",
"제주도 갔을 때 찍었던 사진들",
"유럽 배낭여행 때 찍은 에펠탑 야경",
"지울까 말까 고민되는 흔들린 사진들",
"비트코인 가격 얼마야?",
"고양이 안고 있는 사진 찾아줘",
"비 오는 날 카페에서 마신 커피"
];

async function runTests() {
  console.log("🚀 AI 엔진 테스트를 시작합니다...\n");

  for (const query of testCases) {
    console.log(`[입력]: "${query}"`);
    const result = await analyzeUserSearch(query);

    if (result) {
      console.log(` - 적합성: ${result.suitability ? "✅ PASS" : "❌ FAIL"}`);
      if (result.suitability) {
        console.log(` - 키워드(엔티티):`, JSON.stringify(result.entities));
        console.log(` - 가중치:`, JSON.stringify(result.weights));
      }
      console.log(` - 사유:`,  JSON.stringify(result.reason));
    } else {
      console.log(" ❌ 분석 결과 없음");
    }
    console.log("-------------------------------------------\n");
  }
  
  // 앨범 제목 생성 테스트도 한 번 해볼까요?
  // console.log("🎨 앨범 제목 추천 테스트 (샘플 데이터)");
  // const samplePhotoData = "강아지, 산책, 공원, 가을, 낙엽, 2024년 10월";
  // const titles = await require('./src/api/AzureService').generateAlbumTitles(samplePhotoData);
  // console.log(" - 추천 제목:", titles.join(" | "));
}

runTests();