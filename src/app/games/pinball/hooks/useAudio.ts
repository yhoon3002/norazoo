import { AudioPing } from "../types/PinballTypes";

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

export default function useAudio(enabled: boolean): AudioPing {
    let ctx: AudioContext | null = null;

    const ping: AudioPing = () => {
        if (!enabled) return;

        try {
            if (!ctx) {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = "triangle";
                o.frequency.value = 520 + Math.random() * 200;
                g.gain.value = 0.02;
                o.connect(g);
                g.connect(ctx.destination);
                o.start();
                o.stop(ctx.currentTime + 0.05);
            }
        } catch (error) {
            console.log(error);
        }
    };

    return ping;
}
