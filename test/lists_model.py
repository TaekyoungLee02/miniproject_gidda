import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options={'api_version': 'v1'}
)

print("--- 사용 가능한 모델 목록 ---")
try:
    # 2026년 최신 SDK 기준, model.name이 가장 정확한 식별자입니다.
    for model in client.models.list():
        print(f"Model Name: {model.name}")
except Exception as e:
    print(f"목록 추출 중 에러 발생: {e}")