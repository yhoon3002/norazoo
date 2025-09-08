import * as Ably from "ably";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        if (!process.env.ABLY_API_KEY) {
            console.error("ABLY_API_KEY not found in environment variables");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        // URL에서 clientId 파라미터 가져오기
        const url = new URL(request.url);
        const clientId = url.searchParams.get("clientId");

        console.log("Token request for clientId:", clientId); // 디버깅용

        const client = new Ably.Realtime({
            key: process.env.ABLY_API_KEY,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenRequestOptions: any = {
            capability: {
                "arena:*": ["publish", "subscribe", "presence"],
            },
            ttl: 60 * 60 * 1000, // 1시간
        };

        // clientId가 제공되면 토큰에 포함
        if (clientId) {
            tokenRequestOptions.clientId = clientId;
        }

        const tokenRequest = await client.auth.createTokenRequest(
            tokenRequestOptions
        );

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
    return GET(request);
}
