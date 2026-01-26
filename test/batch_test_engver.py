# batch_test_engver.py

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

# 기존 위치 기반 키워드 영문ver. (217개.)
ko_en_map = {
    "입구": "entrance", "출구": "exit", "출입구": "doorway", "출입구번호": "gate number", "영업중": "open for business", "영업종료": "closed", "카페": "cafe", "식당": "restaurant", "레스토랑": "restaurant", "베이커리": "bakery",
    "카페테리아": "cafeteria", "푸드코트": "food court", "편의점": "convenience store", "슈퍼마켓": "supermarket", "대형마트": "hypermarket", "약국": "pharmacy", "병원": "hospital", "치과": "dental clinic", "한의원": "oriental medicine clinic", "은행": "bank",
    "ATM": "ATM", "ATM부스": "ATM booth", "우체국": "post office", "세탁소": "laundry", "미용실": "hair salon", "이발소": "barber shop", "호텔": "hotel", "모텔": "motel", "호스텔": "hostel", "게스트하우스": "guesthouse",
    "리셉션": "reception desk", "주차장": "parking lot", "주차타워": "parking tower", "주차금지": "no parking sign", "입차": "car entering", "출차": "car exiting", "정산소": "parking payment station", "요금소": "toll booth", "만차": "full parking lot", "상가": "commercial building",
    "점포": "store", "매장": "shop", "쇼룸": "showroom", "전시장": "exhibition hall", "갤러리": "art gallery", "전시실": "exhibition room", "판매대": "sales stand", "계산대": "checkout counter", "카운터": "service counter", "엘리베이터": "elevator",
    "에스컬레이터": "escalator", "계단": "stairs", "비상계단": "emergency stairs", "사무실": "office", "회의실": "conference room", "접견실": "reception room", "휴게실": "rest area", "라운지": "lounge", "관리실": "management office", "경비실": "security office",
    "보안실": "security room", "통제실": "control room", "전산실": "server room", "전기실": "electrical room", "기계실": "machine room", "컨테이너": "shipping container", "컨테이너차량": "container truck", "컨테이너하우스": "container house", "컨테이너가설물": "temporary container structure", "창고": "warehouse",
    "시청": "city hall", "구청": "district office", "주민센터": "community center", "동사무서": "neighborhood office", "관공서": "government office", "민원실": "public service office", "화장실": "restroom", "수유실": "nursing room", "도서관": "library", "열람실": "reading room",
    "자료실": "reference room", "반납함": "book return box", "체육관": "gymnasium", "수영장": "swimming pool", "문화센터": "cultural center", "강당": "auditorium", "공원": "public park", "놀이터": "playground", "비상구": "emergency exit", "대피로": "evacuation route",
    "대피소": "shelter", "국립공원": "national park", "등산로": "hiking trail", "해수욕장": "beach", "관측소": "observatory", "취수장": "water intake station", "발전소": "power plant", "광장": "public square", "도심": "downtown", "빌딩": "building",
    "고층": "high-rise building", "아파트": "apartment building", "오피스텔": "studio apartment building", "오피스빌딩": "office building", "횡단보도": "crosswalk", "신호등": "traffic light", "보행신호기": "pedestrian signal", "잔여시간표시기": "pedestrian countdown timer", "음향신호기": "acoustic signal device", "교차로": "intersection",
    "중앙분리대": "median strip", "보행로": "sidewalk", "자전거도로": "bicycle lane", "디지털사이니지": "digital signage", "전광판": "electronic scoreboard", "광고판": "billboard", "현수막": "banner", "옥외광고": "outdoor advertising", "버스쉘터": "bus shelter", "버스정류장": "bus stop",
    "버스정보안내단말기": "bus information terminal", "택시승강장": "taxi stand", "지하철출구": "subway entrance", "터미널": "transportation terminal", "공항": "airport", "활주로": "runway", "차단바": "barrier arm", "주차차단기": "parking gate barrier", "톨게이트": "toll gate", "하이패스단말기": "hi-pass terminal",
    "도로표지판": "road sign", "이정표": "guide sign", "안내판": "information board", "거리표지판": "distance sign", "도로명주소판": "street name sign", "무인단속카메라": "traffic enforcement camera", "과속카메라": "speed camera", "방범카메라": "surveillance camera", "전기차번호판": "EV license plate", "경차번호판": "compact car license plate",
    "EU번호판": "EU license plate", "차량번호판": "license plate", "후면번호판": "rear license plate", "오토바이": "motorcycle", "배달박스": "delivery box", "라바콘": "traffic cone", "안전삼각대": "warning triangle", "과속방지턱": "speed bump", "공중전화부스": "phone booth", "쓰레기통": "trash can",
    "분리수거함": "recycling bin", "흡연부스": "smoking booth", "간판": "signboard", "상가간판": "store sign", "은행간판": "bank sign", "병원표시": "hospital sign", "약국십자가": "pharmacy cross sign", "주유소폴사인": "gas station pole sign", "호텔로고": "hotel logo", "돌출간판": "projecting sign",
    "자동문": "automatic door", "회전문": "revolving door", "셔터": "rolling shutter", "외벽": "exterior wall", "외벽등": "wall light", "경관조명": "landscape lighting", "투광등": "floodlight", "테라스": "terrace", "루프탑": "rooftop", "옥상": "roof",
    "옥상정원": "roof garden", "로비": "lobby", "안내데스크": "information desk", "하천": "stream", "강": "river", "강변": "riverside", "연못": "pond", "폭포": "waterfall", "산": "mountain", "산봉우리": "mountain peak",
    "능선": "mountain ridge", "야산": "hill", "암봉": "rocky peak", "암릉": "rocky ridge", "숲": "forest", "혼효림": "mixed forest", "소나무": "pine tree", "잔디": "grass", "억새풀": "silver grass", "논밭": "farmland",
    "계단식논": "terraced rice field", "무지개": "rainbow", "고드름": "icicle", "우박": "hail", "빙산": "iceberg", "보도블록": "paving stone", "전신주": "utility pole", "송전선": "power lines", "노면": "road surface", "커튼월": "curtain wall",
    "기와지붕": "tiled roof", "지붕": "roof", "담장": "wall fence", "통유리": "glass wall", "동상": "statue", "등대": "lighthouse", "모래": "sand", "파도": "ocean waves", "석양": "sunset", "알루미늄": "aluminum",
    "콘크리트": "concrete", "패널": "building panel", "아이스링크": "ice rink", "둔덕": "mound", "언덕": "hill", "석호": "lagoon", "갯벌": "mudflat"
}

# 앙상블 효과를 위한 영어 키워드 목록 추출
english_keywords = list(ko_en_map.values())

def process_fast_mode():
    if not os.path.exists(desktop_path):
        print(f"폴더를 찾을 수 없습니다: {desktop_path}")
        return

    image_files = [f for f in os.listdir(desktop_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    print(f"유료 티어 가동 {len(image_files)}장의 사진을 교차 분석.")
    
    results = []
    for filename in tqdm(image_files):
        try:
            image_path = os.path.join(desktop_path, filename)
            with open(image_path, "rb") as f:
                image_data = f.read()

            # [Step 1] Gemini 2.0 Flash: 영문 키워드 기반 멀티모달 분석 및 한국어 매핑 출력
            # 영문 리스트(english_keywords)를 참조하여 분석하되 결과는 한국어 매핑 데이터로 출력 요청
            # MobileCLIP의 앙상블 프롬프트 구조를 활용하여 식별 정확도를 높임
            prompt_gemini = f"""
            Analyze this image as a geospatial and environmental identification expert. 
            Compare the visual elements of this photo with the provided keyword list and identify all matches with over 50% relevance.

            Keyword List (English reference): {', '.join(english_keywords)}

            Instructions:
            1. Find matching elements using the English reference list.
            2. Return the matching results ONLY in Korean, using the standard terms (e.g., '교차로', '빌딩', '신호등').
            3. Separate the Korean keywords with commas.
            4. Do not include any English, numbers, or introductory text.
            """

            response_gemini = client_gemini.models.generate_content(
                model="gemini-2.0-flash", 
                contents=[
                    genai.types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    prompt_gemini
                ]
            )
            filtered_keywords = response_gemini.text.strip()

            # [Step 2] GPT-4o-mini: Geospatial 추론 및 구체적인 지역명 특정
            # Gemini가 추출한 한국어 환경 키워드 조합을 분석하여 가장 가능성 높은 동네/지역을 추론
            response_gpt = client_azure.chat.completions.create(
                model=os.getenv("AZURE_DEPLOYMENT_NAME"),
                messages=[
                    {
                        "role": "system", 
                        "content": (
                            "너는 지리 및 도시 환경 전문가(Geospatial Expert)야. "
                            "제공된 시각적 환경 키워드들을 분석하여, 이 사진이 촬영되었을 법한 가장 구체적인 '동네 이름' 또는 '지역명'을 추론해줘. "
                            "만약 특정 지역을 단정하기 어렵다면, 특징적인 지형이나 구역 유형(예: 강남역 인근 상업지구, 북한산 등산로 초입)으로 답변해줘."
                        )
                    },
                    {
                        "role": "user", 
                        "content": f"다음 환경 키워드들이 추출된 사진은 어느 지역에서 찍힌 것일까?\n{filtered_keywords}"
                    }
                ]
            )
            guess = response_gpt.choices[0].message.content.replace(".", "").strip()

            # 결과 리스트에 저장 (파일명, 추출된 한국어 키워드, 추론된 지역명)
            results.append({
                "파일명": filename, 
                "환경_키워드": filtered_keywords, 
                "추측_지역명": guess
            })
            
            # 유료 티어의 Rate Limit을 고려한 최적 지연 시간 (0.3초)
            time.sleep(0.3) 

        except Exception as e:
            print(f"\n[오류 발생] {filename}: {e}")
            time.sleep(1) # 오류 발생 시 세션 안정화를 위한 대기

    # 5. 분석 결과 저장 및 내보내기
    if results:
        df = pd.DataFrame(results)
        output_filename = "batch_test_engver.csv"
        df.to_csv(output_filename, index=False, encoding='utf-8-sig')
        print(f"\n[분석 완료] 결과가 '{output_filename}'에 저장되었습니다.")

if __name__ == "__main__":
    process_fast_mode()