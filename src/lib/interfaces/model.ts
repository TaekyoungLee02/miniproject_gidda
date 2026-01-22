export interface Model<T>
{
    get_embedded_vector(input : T) : number[];
}