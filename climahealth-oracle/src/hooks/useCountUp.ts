import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';
export function useAnimatedInt(target: number, duration = 1.25) {
    const [v, setV] = useState(0);
    useEffect(() => {
        const c = animate(0, Math.round(target), {
            duration,
            onUpdate: (n) => setV(Math.round(n)),
        });
        return () => c.stop();
    }, [target, duration]);
    return v;
}
export function useAnimatedFloat(target: number, duration = 1.25) {
    const [v, setV] = useState(0);
    useEffect(() => {
        const c = animate(0, target, {
            duration,
            onUpdate: (n) => setV(n),
        });
        return () => c.stop();
    }, [target, duration]);
    return v;
}
