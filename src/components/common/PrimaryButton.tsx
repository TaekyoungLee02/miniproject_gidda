import { Text, TouchableOpacity } from 'react-native';

interface Props {
    title: string;
    onPress: () => void;
}

export function PrimaryButton({ title, onPress }: Props) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-orange-400 p-4 rounded-full items-center justify-center shadow-sm active:opacity-80 mt-4"
        >
            <Text className="text-white font-bold text-lg">{title}</Text>
        </TouchableOpacity>
    );
}