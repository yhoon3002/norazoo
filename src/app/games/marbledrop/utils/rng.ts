export function mulberry32(seed: number) {
    let t = seed >>> 0;
    return function () {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export function hashToUint32(str: string): number {
    // Simple FNV-1a 32-bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

export function cryptoRandomHex(bytes = 16): string {
    // 배포 환경에서 crypto가 없을 수 있으므로 안전 장치 추가
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
        // Fallback to Math.random for environments without crypto
        const chars = "0123456789abcdef";
        let result = "";
        for (let i = 0; i < bytes * 2; i++) {
            result += chars[Math.floor(Math.random() * 16)];
        }
        return result;
    }

    const a = new Uint8Array(bytes);
    crypto.getRandomValues(a);
    return Array.from(a)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export async function sha256Hex(s: string): Promise<string> {
    // 배포 환경에서 crypto.subtle이 없을 수 있으므로 안전 장치 추가
    if (typeof crypto === "undefined" || !crypto.subtle) {
        // Fallback: simple hash using string manipulation
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            const char = s.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, "0");
    }

    try {
        const enc = new TextEncoder().encode(s);
        const digest = await crypto.subtle.digest("SHA-256", enc);
        const arr = Array.from(new Uint8Array(digest));
        return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (error) {
        // Fallback if SHA-256 fails
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            const char = s.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, "0");
    }
}
