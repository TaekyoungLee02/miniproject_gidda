import { SearchType } from "@/src/lib/enums/enums"

export interface Api<T>
{
    get_data(text : string) : T;
}

export type ParsedQuery =
{
    query : Map<SearchType, string>;
    weights : Map<SearchType, number>;
};