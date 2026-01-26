import os
import time
import pandas as pd
from google import genai
from openai import AzureOpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# 1. 환경 변수 로드
load_dotenv()

# 2. Gemini 클라이언트 (유료 티어 설정 적용)
client_gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options={'api_version': 'v1'}
)

# 3. Azure OpenAI 클라이언트
client_azure = AzureOpenAI(
    api_key=os.getenv("AZURE_AI_FOUNDRY_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_AI_FOUNDRY_ENDPOINT")
)

# 4. 경로 설정
folder_name = "기존+0124추가촬영분=위치기반사진모음최종0125"
desktop_path = os.path.join(os.path.expanduser("~"), "Desktop", folder_name)

# ✅ [중요] 여기에 기존의 217개 키워드 리스트 전체를 붙여넣으세요.
# '...' 기호가 포함되어 있으면 에러가 납니다.
keyword_pool = [
    "입구", "출구", "출입구", "출입구번호", "영업중", "영업종료", "카페", "식당", "레스토랑", "베이커리", 
    "카페테리아", "푸드코트", "편의점", "슈퍼마켓", "대형마트", "약국", "병원", "치과", "한의원", "은행", 
    "ATM", "ATM부스", "우체국", "세탁소", "미용실", "이발소", "호텔", "모텔", "호스텔", "게스트하우스", 
    "리셉션", "주차장", "주차타워", "주차금지", "입차", "출차", "정산소", "요금소", "만차", "상가", 
    "점포", "매장", "쇼룸", "전시장", "갤러리", "전시실", "판매대", "계산대", "카운터", "엘리베이터", 
    "에스컬레이터", "계단", "비상계단", "사무실", "회의실", "접견실", "휴게실", "라운지", "관리실", "경비실", 
    "보안실", "통제실", "전산실", "전기실", "기계실", "컨테이너", "컨테이너차량", "컨테이너하우스", "컨테이너가설물", "창고", 
    "시청", "구청", "주민센터", "동사무서", "관공서", "민원실", "화장실", "수유실", "도서관", "열람실", 
    "자료실", "반납함", "체육관", "수영장", "문화센터", "강당", "공원", "놀이터", "비상구", "대피로", 
    "대피소", "국립공원", "등산로", "해수욕장", "관측소", "취수장", "발전소", "광장", "도심", "빌딩", 
    "고층", "아파트", "오피스텔", "오피스빌딩", "횡단보도", "신호등", "보행신호기", "잔여시간표시기", "음향신호기", "교차로", 
    "중앙분리대", "보행로", "자전거도로", "디지털사이니지", "전광판", "광고판", "현수막", "옥외광고", "버스쉘터", "버스정류장", 
    "버스정보안내단말기", "택시승강장", "지하철출구", "터미널", "공항", "활주로", "차단바", "주차차단기", "톨게이트", "하이패스단말기", 
    "도로표지판", "이정표", "안내판", "거리표지판", "도로명주소판", "무인단속카메라", "과속카메라", "방범카메라", "전기차번호판", "경차번호판", 
    "EU번호판", "차량번호판", "후면번호판", "오토바이", "배달박스", "라바콘", "안전삼각대", "과속방지턱", "공중전화부스", "쓰레기통", 
    "분리수거함", "흡연부스", "간판", "상가간판", "은행간판", "병원표시", "약국십자가", "주유소폴사인", "호텔로고", "돌출간판", 
    "자동문", "회전문", "셔터", "외벽", "외벽등", "경관조명", "투광등", "테라스", "루프탑", "옥상", 
    "옥상정원", "로비", "안내데스크", "하천", "강", "강변", "연못", "폭포", "산", "산봉우리", 
    "능선", "야산", "암봉", "암릉", "숲", "혼효림", "소나무", "잔디", "억새풀", "논밭", 
    "계단식논", "무지개", "고드름", "우박", "빙산", "보도블록", "전신주", "송전선", "노면", "커튼월", 
    "기와지붕", "지붕", "담장", "통유리", "동상", "등대", "모래", "파도", "석양", "알루미늄", 
    "콘크리트", "패널", "아이스링크", "둔덕", "언덕", "석호", "갯벌"
]

def process_fast_mode():
    if not os.path.exists(desktop_path):
        print(f"❌ 폴더를 찾을 수 없습니다: {desktop_path}")
        return

    image_files = [f for f in os.listdir(desktop_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    print(f"🔥 유료 티어 가동! {len(image_files)}장의 사진을 초고속으로 분석합니다.")
    
    results = []
    for filename in tqdm(image_files):
        try:
            image_path = os.path.join(desktop_path, filename)
            with open(image_path, "rb") as f:
                image_data = f.read()

            # [Step 1] Gemini 2.0 Flash 분석
            response_gemini = client_gemini.models.generate_content(
                model="gemini-2.0-flash", 
                contents=[
                    genai.types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    f"이 사진과 연관성 50% 이상인 키워드만 골라 번호 붙여줘: {', '.join(keyword_pool)}"
                ]
            )
            filtered_keywords = response_gemini.text.strip()

            # [Step 2] GPT-4o-mini 지역 추론
            response_gpt = client_azure.chat.completions.create(
                model=os.getenv("AZURE_DEPLOYMENT_NAME"),
                messages=[
                    {"role": "system", "content": "너는 지리 전문가야. 동네 이름만 짧게 말해."},
                    {"role": "user", "content": f"이 키워드들은 어느 지역 사진일까?\n{filtered_keywords}"}
                ]
            )
            guess = response_gpt.choices[0].message.content.strip()

            results.append({"파일명": filename, "키워드": filtered_keywords, "추측지역": guess})
            
            # 유료 티어는 대기 시간을 0.5초로 줄여도 무방합니다.
            time.sleep(0.5) 

        except Exception as e:
            print(f"\n⚠️ {filename} 오류 발생: {e}")
            time.sleep(1)

    # 5. 결과 저장
    if results:
        df = pd.DataFrame(results)
        df.to_csv("test_results_paid_final.csv", index=False, encoding='utf-8-sig')
        print(f"\n✅ 고속 분석 완료! 'test_results_paid_final.csv'를 확인하세요.")

if __name__ == "__main__":
    process_fast_mode()