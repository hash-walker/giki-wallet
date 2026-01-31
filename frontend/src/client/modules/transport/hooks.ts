import { useEffect, useState } from 'react';
import type { ActiveHold } from './validators';

/**
 * Custom hook to manage hold timer
 * Returns time left in seconds for the soonest expiring hold
 */
export function useHoldTimer(activeHolds: ActiveHold[]) {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (activeHolds.length === 0) {
            setTimeLeft(0);
            return;
        }

        // Find soonest expiring hold
        const soonest = activeHolds.reduce((prev, curr) =>
            new Date(prev.expires_at) < new Date(curr.expires_at) ? prev : curr
        );

        const expiry = new Date(soonest.expires_at).getTime();

        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((expiry - now) / 1000));
            setTimeLeft(diff);
        };

        tick(); // Initial tick
        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, [activeHolds]);

    return timeLeft;
}
