"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('SW registered'))
                .catch(err => console.log('SW registration failed: ', err));
        }
    }, []);

    return null;
}
