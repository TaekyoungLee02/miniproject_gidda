import os
import time
import pandas as pd
from google import genai
from openai import AzureOpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# 1. 환경 변수 로드
load_dotenv()

# 2. Gemini 클라이언트
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
folder_name = "model_test"
image_folder = os.path.join(os.path.expanduser("~"), "Desktop", folder_name, "people", "processed")

# 5. 한국어-영어 매핑 사전 (116개. 정제 완료)
ko_en_map = {
    "가방": "bag", "가위": "knife", "가구": "cabinet", "감자": "potato", "거울": "mirror", "고기": "meat",
    "과일": "fruit", "과자": "cookie", "광장": "lobby", "그릇": "bowl", "그릴": "grill", "글루": "glue",
    "기계": "machine", "꽃": "flower", "나무": "tree", "낱개": "bunch", "냄비": "pot", "냉장고": "refrigerator",
    "단지": "jar", "달걀": "egg", "닭고기": "meatballs", "담배": "cigar", "딸기": "strawberry", "떡갈비": "patty",
    "라면": "noodle", "로비": "lobby", "로션": "lotion", "망고": "mango", "맥주": "beer", "먹거리": "food",
    "면": "pasta", "물병": "bottle", "밀크쉐이크": "milkshake", "바닥": "floor", "바구니": "basket", "박스": "box",
    "반찬": "dish", "발": "foot", "밥": "rice", "방": "kitchen", "베이글": "bagel", "버거": "hamburger",
    "버섯": "mushrooms", "벽": "wall", "벽시계": "clock", "병": "bottle", "보관함": "container", "봉지": "package",
    "부페": "buffet", "브러쉬": "brush", "빵": "bread", "사탕": "chocolate", "산책": "linger", "살라미": "meat",
    "샐러드": "salad", "샌드위치": "sandwich", "새우": "shrimp", "세면대": "sink", "세럼": "serum", "소스": "sauce",
    "소다": "soda", "소파": "chair", "수건": "paper", "수납장": "shelf", "수프": "soup", "스니커즈": "sneakers",
    "스토브": "stove", "스파게티": "spaghetti", "스프레이": "spray", "스푼": "spoon", "식기": "plate", "식당": "restaurant",
    "신발": "shoes", "신발창": "sole", "아이스": "ice", "아이스크림": "ice cream", "안개": "spray", "양념": "sauce",
    "양파": "onion", "어패류": "oyster", "얼음": "ice", "에어팟": "airpods", "우유": "juice", "워시": "soap",
    "원목": "wooden", "유리잔": "glass", "음료": "drink", "의료기기": "medical supply", "의자": "chair", "입구": "counter",
    "접시": "dish", "제과": "bakery", "제품": "product", "주방": "kitchen", "주스": "juice", "진열장": "display", "차": "tea",
    "채소": "vegetable", "책": "book", "초콜릿": "chocolate", "치즈": "cheese", "카트": "cart", "카페": "coffee", "카펫": "carpet",
    "케이크": "cake", "코스메틱": "cosmetics", "쿠키": "cookie", "타코": "taco", "탁자": "table", "태그": "tag", "트레이": "tray",
    "파스타": "pasta", "판매점": "store", "패키지": "package", "패스트리": "pastry", "팬": "pan", "포크": "fork", "표지판": "tag",
    "피자": "pizza", "함박스테이크": "meat", "해산물": "fish", "화장품": "skin care products", "후추": "pepper", "휴지": "paper",
    "흰쌀": "rice"
}

# 앙상블 효과를 위한 영어 키워드 목록 추출
english_keywords = list(ko_en_map.values())

def process_fast_mode():
    if not os.path.exists(image_folder):
        print(f"폴더를 찾을 수 없습니다: {image_folder}")
        return

    image_files = [f for f in os.listdir(image_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    print(f"유료 티어 가동. {len(image_files)}장의 사진을 교차 분석.")
    
    results = []
    for filename in tqdm(image_files):
        try:
            image_path = os.path.join(image_folder, filename)
            with open(image_path, "rb") as f:
                image_data = f.read()

            # [Step 1] Gemini 2.0 Flash: 시각적 특징 추출 (영어 키워드로 분석 후 한국어로 출력 요청. Cross-lingual Mapping 기법)
            # 모델은 정교한 영어 키워드로 대조하고, 결과는 한국어로 반환받아 데이터 가독성을 높입니다.
            analysis_prompt = f"""
            Analyze this image as a professional vision expert. 
            Identify all elements from the following list that are clearly present (over 50% relevance).
            
            Keyword Pool: {', '.join(english_keywords)}
            
            Instruction: Return the matching items ONLY in Korean as defined in our mapping.
            Format: comma-separated list without any extra text.
            """

            response_gemini = client_gemini.models.generate_content(
                model="gemini-2.0-flash", 
                contents=[
                    genai.types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    analysis_prompt
                ]
            )
            filtered_keywords = response_gemini.text.strip()

            # [Step 2] GPT-4o-mini: 라이프스타일 및 장소성 추론
            # 추출된 키워드를 바탕으로 해당 사진이 찍혔을 법한 '무드'나 '지역적 특성'을 정의합니다.
            response_gpt = client_azure.chat.completions.create(
                model=os.getenv("AZURE_DEPLOYMENT_NAME"),
                messages=[
                    {"role": "system", "content": "너는 공간 및 라이프스타일 분석 전문가야. 사물 키워드를 보고 이 사진이 찍힌 '장소의 성격'이나 '스타일 무드'를 딱 한 단어로 요약해. 예: 가정집, 파인다이닝, 단답형으로만 답해."},
                    {"role": "user", "content": f"분석된 키워드: {filtered_keywords}"}
                ]
            )
            guess = response_gpt.choices[0].message.content.replace(".", "").strip()

            results.append({
                "파일명": filename, 
                "검출키워드": filtered_keywords, 
                "스타일_장소추측": guess
            })
            
            time.sleep(0.3) # 유료 티어의 경우 안정성을 위해 짧은 대기시간 유지

        except Exception as e:
            print(f"\n {filename} 처리 중 오류: {e}")
            time.sleep(1)

    # 6. 데이터프레임 변환 및 저장
    if results:
        df = pd.DataFrame(results)
        output_filename = "test_results_object_final.csv"
        df.to_csv(output_filename, index=False, encoding='utf-8-sig')
        print(f"\n분석 완료. 결과가 '{output_filename}'에 저장되었습니다.")

if __name__ == "__main__":
    process_fast_mode()