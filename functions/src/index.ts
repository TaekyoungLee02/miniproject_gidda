import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https"; // v2 권장
import { defineSecret } from "firebase-functions/params";

// 전역 설정 (리전 등을 설정할 수 있습니다)
// setGlobalOptions({ region: "us-central1" });

const AZURE_AI_FOUNDRY_KEY = defineSecret("AZURE_AI_FOUNDRY_KEY");
const AZURE_AI_FOUNDRY_ENDPOINT = defineSecret("AZURE_AI_FOUNDRY_ENDPOINT");

// ✅ 반드시 'export'를 붙여야 외부에서 보입니다!
export const api = onRequest({ secrets: [AZURE_AI_FOUNDRY_KEY, AZURE_AI_FOUNDRY_ENDPOINT] }, async (req, res) => {
    try {
        // 1. 요청 데이터 확인 (req.body)
        // 2. Azure API 호출 로직 (여기에 작성하신 코드를 넣으세요)
        // 3. 결과 반환 (res.send 또는 res.json)
        const url = AZURE_AI_FOUNDRY_ENDPOINT.value();

        console.log(`url`, url);

        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // 인증은 리소스/설정에 따라 api-key 또는 bearer 토큰을 씁니다.
                // api-key 방식이면:
                "api-key": AZURE_AI_FOUNDRY_KEY.value(),
                // bearer 방식이면:
                // "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(req.body),
        });

        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content ?? "";

        console.log(`content`, content)

        res.status(200).json({ content, raw: data });
    } catch (error) {
        console.error("서버 에러:", error);
        res.status(500).send("Internal Server Error");
    }
});
setGlobalOptions({ maxInstances: 10 });