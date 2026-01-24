import { Text, View } from "react-native";
import * as Model from '@/src/model/Model'
import { useState, useEffect } from 'react';

export default function Index() {

    let a = new Model.ImageEncoder()

    useEffect(() => {
        const b = async () =>
        {
            // 1 * 3 * 256 * 256 = 196,608개의 요소가 필요함
            const dims = [1, 3, 256, 256];
            const size = dims.reduce((a, b) => a * b, 1);

            // 모든 값이 0인 데이터 생성
            const floatData = new Float32Array(size);
            await a.initialize()
            console.log(await a.run(floatData));
        }
        b();
    }, []);



  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text></Text>
    </View>
  );
}
