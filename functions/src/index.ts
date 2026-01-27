/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https"; // v2 권장

// 전역 설정 (리전 등을 설정할 수 있습니다)
setGlobalOptions({ region: "us-central1" });

// ✅ 반드시 'export'를 붙여야 외부에서 보입니다!
export const api = onRequest({ cors: true }, async (req, res) => {
  try {
    // 1. 요청 데이터 확인 (req.body)
    // 2. Azure API 호출 로직 (여기에 작성하신 코드를 넣으세요)
    // 3. 결과 반환 (res.send 또는 res.json)
    
    // 예시 응답 (작성하신 Azure 호출 코드가 이 자리에 들어가야 합니다)
    res.status(200).json({ message: "서버가 정상적으로 작동합니다!" });

  } catch (error) {
    console.error("서버 에러:", error);
    res.status(500).send("Internal Server Error");
  }
});
setGlobalOptions({ maxInstances: 10 });

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.


// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
