import * as Ably from "ably";
import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
    try {
        if (!process.env.ABLY_API_KEY) {
            console.error("ABLY_API_KEY not found in environment variables");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        const client = new Ably.Realtime({
            key: process.env.ABLY_API_KEY,
        });

        const tokenRequest = await client.auth.createTokenRequest({
            capability: {
                "arena:*": ["publish", "subscribe", "presence"],
            },
            ttl: 60 * 60 * 1000, // 1시간
        });

        return NextResponse.json(tokenRequest);
    } catch (error) {
        console.error("Token generation failed:", error);
        return NextResponse.json(
            { error: "Token generation failed" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    // POST 요청도 지원하려면 동일한 로직
    return GET(request);
}
