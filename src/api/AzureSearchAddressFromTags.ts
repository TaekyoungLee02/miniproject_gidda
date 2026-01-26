import { client } from "./AzureFoundry";
import { TAG_SEARCH_PROMPT_SYSTEM, TAG_SEARCH_PROMPT_USER} from './constants/prompts';
import {Photo} from "@/src/lib/types/photo";

export const tagAddress = async (photos: Photo[]) =>
{
    for(const i in photos)
    {
        try {
            const response = await client.chat.completions.create({
                model: process.env.EXPO_PUBLIC_AZURE_DEPLOYMENT_NAME || "gpt-4o-mini",
                messages: [
                    { role: "system", content: TAG_SEARCH_PROMPT_SYSTEM }, // 날짜 주입!
                    { role: "user", content: `${TAG_SEARCH_PROMPT_USER} : ${photos[i].ai_tags}` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1, // 분석의 일관성을 위해 더 낮춤
            });

            const result = response.choices[0].message.content;
            if (!result) return null;

            const parsed = JSON.parse(result);
            photos[i].address = parsed.address as string;
        }
        catch (e)
        {
            console.error(`address tagging failed in (${i}: ${photos[i].local_uri}) : ${e}`);
        }
    }
}

