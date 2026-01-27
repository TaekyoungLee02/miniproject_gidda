import { Photo } from "@/src/lib/types/photo";
import { PROXY_URL } from "@/src/lib/constants/constants"
import axios from "axios";

export const tagAddress = async (photos: Photo[]) =>
{
    console.log("🚀 [Azure Proxy] URL Check:", PROXY_URL ? "✅ Connected" : "❌ Missing URL");

    for(const i in photos)
    {
        if (!photos[i].ai_tags || photos[i].ai_tags.trim() === '') {
            console.log(`⚠️ [Azure] ID(${photos[i].id})는 분석할 태그(ai_tags)가 없습니다. 스킵.`);
            continue;
        }

        try {

            const dateStr = new Date(photos[i].captured_at).toLocaleString();
            const locationHint = (photos[i].latitude && photos[i].longitude)
                ? `(참고 GPS: 위도 ${photos[i].latitude}, 경도 ${photos[i].longitude})`
                : '(GPS 정보 없음)';

            // 실제 DB에 저장된 태그 사용
            // DB에는 "sea, sky, rock" 처럼 저장되어 있을 수 있음.
            const detectedTags = photos[i].ai_tags;

            console.log(``, dateStr)
            console.log(``, locationHint)
            console.log(``, detectedTags)

            const userPrompt = `
                  나는 사진의 위치를 찾고 있어. 아래 정보를 단서로 여기가 어디인지 추리해줘.
                 
                  [정보]
                  - 시각적 특징(Tags): ${detectedTags}
                  - 촬영 날짜: ${dateStr}
                  - 위치 힌트: ${locationHint}
                 
                  [요청사항]
                  - 위 태그들을 조합했을 때 한국(또는 사용자가 자주 가는 해외 여행지) 내에서 가장 유력한 '구체적인 장소명' 하나만 말해줘.
                  - 그 장소의 대표적인 위도(latitude)와 경도(longitude) 좌표를 추정해.
                  - 답변은 모두 영어 소문자로만 구성해.
                  - **반드시 아래 JSON 포맷으로만 답변해.** (다른 말 금지)
             
                  {
                    "name": "장소명 (예: jeju seongsan ilchulbong)",
                    "latitude": 33.458,
                    "longitude": 126.942
                  }
                `;

            const payload = {
                messages: [
                    {
                        role: 'system',
                        content: '당신은 사진의 메타데이터와 태그를 분석하여 촬영 장소를 정확히 맞추는 AI 탐정입니다.',
                    },
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ]
            };

            // ✅ [변경점 4] Axios를 사용하여 Proxy로 POST 요청
            // (api-key 헤더 제거됨 -> 서버가 처리함)
            const response = await axios.post(PROXY_URL, payload);

            console.log(`response ${JSON.stringify(response.data.resp)}`);

            if (response.status != 200) {
                console.error('❌ [Azure] API 호출 오류:', response.data);
                throw new Error(`Azure API Error: ${response.status}`);
            }
            //
            // const data = JSON.stringify(response.data);
            //
            // if (!data) {
            //     throw new Error("Azure 응답이 비어있습니다.");
            // }

            const parsed = JSON.parse(response.data.resp);

            console.log(`parsed : `, parsed)

            // unknown 처리
            if (parsed.name === 'unknown') {
                console.log(`🤷‍♂️ [Azure] 위치 특정 실패 (unknown)`);
                return null;
            }

            console.log(`🧠 [Azure] 추론 성공: ${parsed.name} (${parsed.latitude}, ${parsed.longitude})`);
            photos[i].address = parsed.address as string;
        }
        catch (e)
        {
            console.error('❌ [Azure Proxy] 위치 추론 중 에러 발생:', e.message || e);
            if (e.response) {
                console.error("Server Response:", e.response.data);
            }
            photos[i].address = "nomatch";
        }
    }
}