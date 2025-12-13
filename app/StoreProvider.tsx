'use client';
import { myStore } from "@/lib/store";
import { Provider } from "react-redux";

export default function StoreProvider({children}:{children: React.ReactNode}) {
  return (
    <Provider store={myStore}>
        {children}
    </Provider>
  )
}
