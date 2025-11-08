import { NextResponse } from "next/server";

function ensureApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
  return key;
}

export async function GET() {
  try {
    const apiKey = ensureApiKey();

    // Return the API key as an ephemeral token
    // In production, you might want to create a short-lived token
    return NextResponse.json({
      value: apiKey,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json(
      {
        error: "Unable to get token",
        detail: message,
      },
      { status: 500 }
    );
  }
}

