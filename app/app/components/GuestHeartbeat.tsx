"use client";
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

// Sends a heartbeat every 2 minutes to update session duration for guests
export default function GuestHeartbeat() {
    const { data: session } = useSession();

    useEffect(() => {
        const role = (session?.user as any)?.role;
        if (role !== 'guest') return;

        const sendHeartbeat = async () => {
            try {
                await fetch('/api/admin/logs', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip: null }),
                });
            } catch { }
        };

        // Send immediately on mount, then every 2 minutes
        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 120000);
        return () => clearInterval(interval);
    }, [session]);

    return null;
}
