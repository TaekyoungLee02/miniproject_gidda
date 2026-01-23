import { Text, View } from "react-native";
import * as Model from '@/src/model/Model'
import { useState, useEffect } from 'react';

export default function Index() {

    let a = new Model.TextEncoder()

    useEffect(() => {
        const b = async () =>
        {
            await a.initialize()
            console.log(await a.run("hello"));
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
