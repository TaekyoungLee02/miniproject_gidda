# batch_test_engver_locationbasedphoto_all.py

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
desktop_path = os.path.join(os.path.expanduser("~"), "Desktop", "기존+0124추가촬영분=위치기반사진모음최종0125", "processed")

# CLIP으로 사진 넣어놓은 후 텍스트 추출 (72개.)
ko_en_map = {
    "스케이트장": "skating rink", "스케이트 파크": "skate park", "하늘": "sky", "구름": "cloud", "버스": "bus", "빌딩": "building", 
    "자동차": "car", "푸른 들판": "green field", "언덕": "hill", "배경": "background", "호수": "lake", "나무": "tree", "덤불": "bush",
    "물": "water", "도로": "road", "도시": "city", "창문": "window", "바다": "ocean", "하이 앵글": "high angle", "소나무": "pine tree",
    "연": "kite", "산": "mountain", "흙 들판": "dirt field", "헛간": "barn", "흙길": "dirt road", "달": "moon", "거리": "street",
    "도시 경관": "cityscape", "신호등": "traffic light", "횡단보도": "crosswalk", "자전거 도로": "bike lane", "지붕": "roof",
    "평평한 꼭대기": "flat top", "표지판": "sign", "광고판": "billboard", "장면": "scene", "방": "room", "꽃": "flower", "탁자": "table",
    "현수막": "banner", "강": "river", "보트": "boat", "다리": "bridge", "문": "gate", "돌": "stone", "굴뚝": "chimney", "벽": "wall",
    "마당": "courtyard", "잔디밭": "lawn", "골프장": "golf course", "나무 정자": "wooden pavilion", "접시": "plate", "인도": "sidewalk",
    "눈보라": "snowstorm", "눈": "snow", "주차장": "parking lot", "벤치": "bench", "자전거": "bike", "바람": "wind", "울타리": "fence",
    "상점": "shop", "해변": "beach", "거리감": "distance", "빛": "light", "시계": "clock", "파도": "waves", "모래": "sand", "발코니": "balcony",
    "타워": "tower", "비행기": "plane", "활주로": "runway", "지면": "ground"
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
            2. Return the matching results ONLY in Korean, using the standard terms (e.g., '활주로', '빌딩', '신호등').
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
                            "제공된 시각적 환경 키워드들을 분석하여, 이 사진이 촬영되었을 법한 가장 구체적인 '나라', '동네 이름' 또는 '지역명'을 추론해줘. "
                            "만약 특정 지역을 단정하기 어렵다면, 특징적인 지형이나 구역 유형(예: 암스테르담 철도역, 한남동 인근 고가차도)으로 답변해줘."
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
        output_filename = "batch_test_engver_locationbasedphoto_all.csv"
        df.to_csv(output_filename, index=False, encoding='utf-8-sig')
        print(f"\n[분석 완료] 결과가 '{output_filename}'에 저장되었습니다.")

if __name__ == "__main__":
    process_fast_mode()