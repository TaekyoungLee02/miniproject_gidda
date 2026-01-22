import { dbRequest } from "@/src/lib/types/dbRequest"

export interface QuerySearcher<T extends dbRequest>
{
    query_search(query : string) : T[] // temp return type
}