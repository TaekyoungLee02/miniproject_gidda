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

# 5. 한국어-영어 매핑 사전 (133개)
ko_en_map = {
    "에어팟": "airpods", "발목": "ankle", "뒷모습": "back view", "가방": "bag",
    "탈모": "bald", "대머리": "bald head", "공": "ball", "머리띠": "band",
    "바구니": "basket", "비니": "beanie", "턱수염": "beard", "벨트": "belt",
    "베레모": "beret", "자전거": "bike", "블론드헤어": "blonde hair", "피": "blood",
    "아웃포커싱": "blurred background", "책": "book", "부츠": "boots", "꽃다발": "bouquet",
    "팔찌": "bracelet", "서류가방": "briefcase", "브로치": "brooch", "카페": "cafe",
    "카메라": "camera", "운반중": "carrying", "캐주얼": "casual", "휴대폰": "cell phone",
    "담배": "cigarette", "클로즈업": "close-up", "코트": "coat", "커피잔": "coffee cup",
    "원뿔": "conic", "면소재": "cotton", "신용카드": "credit card", "횡단보도": "crosswalk",
    "인파": "crowd", "곱슬머리": "curly hair", "주간": "daylight", "데님": "denim",
    "청자켓": "denim jacket", "강아지": "dog", "인형": "doll", "드레스": "dress",
    "귀": "ear", "이어폰": "earphones", "귀걸이": "earrings", "눈": "eye",
    "시선맞춤": "eye contact", "페도라": "fedora", "들판": "field", "후리스": "fleece",
    "꽃": "flower", "발": "foot", "포멀": "formal", "전신샷": "full-shot",
    "장갑": "gloves", "머리카락": "hair", "손": "hand", "모자": "hat",
    "헤드셋": "headset", "하이힐": "heels", "잡고있음": "holding", "후드티": "hoodie",
    "실내": "indoor", "자켓": "jacket", "무릎": "knee", "니트": "knit",
    "대형견": "large dog", "가죽": "leather", "가죽가방": "leather bag", "가죽장갑": "leather gloves",
    "가죽자켓": "leather jacket", "로퍼": "loafers", "긴머리": "long hair", "바라봄": "looking",
    "럭셔리": "luxury", "오토바이": "motorcycle", "입": "mouth", "목도리": "muffler",
    "목": "neck", "목걸이": "necklace", "무표정": "neutral", "신문": "newspaper",
    "야간": "night", "코": "nose", "코피어싱": "nose piercing", "실외": "outdoor",
    "패딩": "padding", "종이봉투": "paper bag", "공원": "park", "파우치": "pouch",
    "옆모습": "profile", "강아지(새끼)": "puppy", "비오는": "rainy", "반지": "ring",
    "달리기": "running", "스카프": "scarf", "진지함": "serious", "셔츠": "shirt",
    "짧은머리": "short hair", "반팔셔츠": "short sleeve shirt", "반바지": "shorts", "어깨": "shoulder",
    "숄더백": "shoulder bag", "보도": "sidewalk", "1인": "single person", "앉아있음": "sitting",
    "웃음": "smiling", "스니커즈": "sneakers", "계단": "stairs", "서있음": "standing",
    "스타킹": "stockings", "거리": "street", "지하철": "subway", "수트": "suit",
    "선글라스": "sunglasses", "맑음": "sunny", "대화중": "talking", "넥타이": "tie",
    "함께": "together", "에코백": "tote bag", "도심": "urban", "빈티지": "vintage",
    "걷기": "walking", "벽": "wall", "지갑": "wallet", "와펜": "wappen",
    "손목시계": "watch", "물병": "water bottle", "반곱슬머리": "wavy hair", "흰머리": "white hair",
    "손목": "wrist"
}

# 앙상블 효과를 위한 영어 키워드 목록 추출
english_keywords = list(ko_en_map.values())

def process_fast_mode():
    if not os.path.exists(image_folder):
        print(f"폴더를 찾을 수 없습니다: {image_folder}")
        return

    image_files = [f for f in os.listdir(image_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    print(f"유료 티어 가동. {len(image_files)}장의 사진 분석 시작.")
    
    results = []
    for filename in tqdm(image_files):
        try:
            image_path = os.path.join(image_folder, filename)
            with open(image_path, "rb") as f:
                image_data = f.read()

            # [Step 1] Gemini 2.0 Flash 분석 (영어 키워드로 분석 후 한국어로 출력 요청)
            # MobileCLIP의 앙상블 프롬프트 개념을 텍스트 프롬프트에 녹였습니다.
            prompt = f"""
            Analyze this image as a professional fashion expert. 
            Identify all elements from the list below that have more than 50% relevance to the photo.
            
            Keyword List: {', '.join(english_keywords)}
            
            Return the matching results ONLY in Korean as defined in our mapping (e.g., '에어팟', '청자켓'). 
            Separate them with commas.
            """

            response_gemini = client_gemini.models.generate_content(
                model="gemini-2.0-flash", 
                contents=[
                    genai.types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    prompt
                ]
            )
            filtered_keywords = response_gemini.text.strip()

            # [Step 2] GPT-4o-mini 스타일 분석
            response_gpt = client_azure.chat.completions.create(
                model=os.getenv("AZURE_DEPLOYMENT_NAME"),
                messages=[
                    {"role": "system", "content": "너는 인물 및 라이프스타일 분석 전문가야. 주어진 키워드를 분석하여 인물의 스타일을 '동네 이름' 또는 '핵심 스타일 무드' 중 가장 적합한 것 하나로 요약해. 딱 한 단어(예: 성수동, 한남동, 비즈니스, 올드머니)로만 답해줘."},
                    {"role": "user", "content": f"다음 키워드의 인물 스타일은?\n{filtered_keywords}"}
                ]
            )
            guess = response_gpt.choices[0].message.content.replace(".", "").strip()

            results.append({"파일명": filename, "키워드": filtered_keywords, "추측지역": guess})
            
            time.sleep(0.5) 

        except Exception as e:
            print(f"\n {filename} 오류 발생: {e}")
            time.sleep(1)

    # 5. 결과 저장
    if results:
        df = pd.DataFrame(results)
        # 파일명을 유료 티어와 매칭되게 수정
        df.to_csv("test_results_paid_final_people.csv", index=False, encoding='utf-8-sig')
        print(f"\n 분석 완료. 'test_results_paid_final_people.csv'를 확인하세요.")

if __name__ == "__main__":
    process_fast_mode()