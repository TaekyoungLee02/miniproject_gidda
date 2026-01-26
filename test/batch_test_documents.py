import os
import time
import pandas as pd
from google import genai
from openai import AzureOpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# 1. 환경 변수 로드
load_dotenv()

# 2. Gemini 클라이언트 설정
client_gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options={'api_version': 'v1'}
)

# 3. Azure OpenAI 클라이언트 설정
client_azure = AzureOpenAI(
    api_key=os.getenv("AZURE_AI_FOUNDRY_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_AI_FOUNDRY_ENDPOINT")
)

# 4. 경로 설정
folder_name = "model_test"
image_folder = os.path.join(os.path.expanduser("~"), "Desktop", folder_name, "documents", "processed")

# 5. 한국어-영어 매핑 사전 (52개)
ko_en_map = {
    # 신분 및 기본 증명
    "주민등록표등본": "Family registration table",
    "가족관계증명서": "Family record with emblem",
    "혼인관계증명서": "Marriage certificate with seal",
    "주민등록증": "ID card with photo",
    "운전면허증": "Driver license card",
    "인감증명서": "Official certificate of seal impression",
    "기본증명서": "Basic identity certificate",
    "병적증명서": "Military record with seal",

    # 부동산 및 거주
    "부동산 등기부등본": "Document with blue watermark",
    "건축물대장": "Building ledger with floorplan",
    "토지이용계획확인서": "Land map with color zones",
    "토지대장": "Official land ledger",
    "부동산 매매계약서": "Contract with red stamps",
    "전입세대확인서": "Moving-in report form",
    "주택 임대차 계약 신고필증": "Official certificate standard residential lease agreement",

    # 세무 및 소득
    "납세증명서(국세)": "Tax certificate with logo",
    "지방세 납세증명서": "Local tax document",
    "부가가치세 과세표준증명": "VAT certificate with table",
    "소득금액증명": "Income report with table",
    "휴폐업사실증명": "Business closure form",
    "간이영수증": "Handwritten tax receipt",
    "근로소득 원천징수영수증": "Withholding Tax Receipt",

    # 금융 및 보험
    "은행거래내역서": "Bank statement grid",
    "잔액증명서": "Balance certificate with seal",
    "통장사본": "Bankbook copy with logo",
    "대출약정서": "Loan contract with table",
    "카드이용대금명세서": "Credit card statement list",
    "국민연금 가입증명서": "Pension document with logo",
    "건강보험 자격득실확인서": "Health insurance record",
    "건강 장기요양보험료 납부확인서": "Health Insurance Payment Certificate",

    # 교육 및 경력
    "졸업증명서": "Degree with gold seal",
    "성적증명서": "Transcript with grade table",
    "재학증명서": "Student enrollment form",
    "자격증": "License card with QR",
    "경력증명서(표준)": "Career record with table",
    "이직확인서": "Resignation form with stamp",
    "생활기록부": "School report card",

    # 비즈니스 및 행정
    "위임장": "Legal power of attorney",
    "사업자등록증": "Business Registration Certificate",
    "회의록": "Meeting minutes with signatures",
    "견적서": "Price quote with logo",
    "거래명세서": "Shipping list with table",

    # 생활 및 교통
    "자동차등록증": "Vehicle registration form",
    "교통법규위반 고지서": "Traffic ticket with photo",
    "과태료 부과고지서": "Fine notice with barcode",

    # 법적 서식
    "표준근로계약서": "Labor contract with table",
    "출입국 사실증명": "Entry exit record",
    "비자신청서": "Visa form with photo",

    # 기타
    "낙서한 종이": "Paper with messy handwriting",
    "전단지": "Colorful promotional flyer",
    "깨끗한 공문서": "Clean official document",
    "무작위 낙서": "Random scribbles"
}

# 영어 키워드 목록 추출
english_keywords = list(ko_en_map.values())

def process_fast_mode():
    if not os.path.exists(image_folder):
        print(f"폴더를 찾을 수 없습니다: {image_folder}")
        return

    image_files = [f for f in os.listdir(image_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    print(f"분석 시작: 총 {len(image_files)}장의 이미지를 처리합니다.")
    
    results = []
    for filename in tqdm(image_files):
        try:
            image_path = os.path.join(image_folder, filename)
            with open(image_path, "rb") as f:
                image_data = f.read()

            # [Step 1] Gemini 2.0 Flash 분석
            prompt = f"""
            Analyze this image as an expert in document classification.
            Identify all elements from the list below that have more than 50% relevance to the photo.
            
            Keyword List: {', '.join(english_keywords)}
            
            Return the matching results ONLY in Korean as defined in our mapping (e.g., '주민등록증', '낙서한 종이'). 
            Separate multiple results with commas.
            """

            response_gemini = client_gemini.models.generate_content(
                model="gemini-2.0-flash", 
                contents=[
                    genai.types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    prompt
                ]
            )
            filtered_keywords = response_gemini.text.strip()

            # [Step 2] GPT-4o-mini 최종 분류 (주민/면허/낙서/전단지 판별)
            response_gpt = client_azure.chat.completions.create(
                model=os.getenv("AZURE_DEPLOYMENT_NAME"),
                messages=[
                    {
                        "role": "system", 
                        "content": "너는 문서 분류 전문가야. 주어진 키워드를 분석해서 이 이미지가 '주민등록증', '운전면허증', '낙서한 종이', '전단지' 중 무엇인지 딱 하나만 골라줘. 만약 위 4개에 해당하지 않으면 '기타 문서'라고 답해. 단어 이외의 설명은 하지 마."
                    },
                    {
                        "role": "user", 
                        "content": f"다음 추출된 키워드를 바탕으로 문서 종류를 판별해줘: {filtered_keywords}"
                    }
                ]
            )
            
            guess = response_gpt.choices[0].message.content.strip()
            results.append({
                "파일명": filename, 
                "키워드": filtered_keywords, 
                "문서종류": guess
            })
            
            time.sleep(0.5) 

        except Exception as e:
            print(f"\n {filename} 오류 발생: {e}")
            time.sleep(1)

    # 5. 결과 저장
    if results:
        df = pd.DataFrame(results)
        df.to_csv("test_results_final_documents.csv", index=False, encoding='utf-8-sig')
        print(f"\n 분석 완료. 'test_results_final_documents.csv'를 확인하세요.")

if __name__ == "__main__":
    process_fast_mode()