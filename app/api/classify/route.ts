import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert customer support analyst for an AI photo generation app.
Your task is to analyze the provided customer support conversation and extract actionable insights.

Output STRICT JSON only matching this exact schema:
{
  "category": "string",
  "has_frustration": boolean,
  "frustration_reason": "string|null",
  "is_dual_intent": boolean,
  "also_relevant_to": ["string"],
  "cross_tag_reasons": {
    "engineering": "string|null",
    "product_quality": "string|null"
  },
  "confidence": "high|low"
}

"category" MUST be exactly 1 of the following:
- attribute_mismatch: user complaining about styling, hair, color, deformed, glitch, blurry.
- auth_access: login issues, account access, deletion.
- upload_flow: photo upload errors, accessing uploaded photos.
- payment_checkout: payment fail, checkout, double charge, credits missing.
- other_bugs: general bugs, UI issues, crashes.
- customization_request: custom retouching, manual edits.
- core_feature_request: asking for new features.
- refund_request: asking for money back.
- subscription_cancel: asking to cancel sub.
- system_automated: spam, auto replies.
- general_inquiry: pre-sales, status, other questions.

Rules:
1. "has_frustration": true only if the user uses explicit angry words, profanity, or extreme dissatisfaction.
2. "is_dual_intent": true if the conversation spans 2 totally distinct issues (e.g. refund AND bug).
3. "also_relevant_to": include "engineering" if it's a technical bug/crash; include "product_quality" if it's a bad AI generation.
4. "cross_tag_reasons": provide a short direct quote (max 1 sentence) from the user that justifies the engineering or product_quality tag.`;

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey || anthropicKey === "" || anthropicKey === "your_anthropic_api_key_here") {
    return NextResponse.json({ error: "Invalid or missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  try {
    const { conversationText } = await req.json();

    const apiUrl = "https://api.anthropic.com/v1/messages";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Analyze this conversation:\n${conversationText}` }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 429) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      throw new Error(data.error?.message || `Anthropic API Error: ${response.status}`);
    }
    
    const textBlock = data.content?.find((block: any) => block.type === "text");
    const resText = textBlock?.text;

    if (!resText) {
      console.error("Empty response! Raw data:", JSON.stringify(data, null, 2));
      throw new Error("Empty response from LLM");
    }

    // Claude might wrap JSON in markdown block or conversational fluff
    const jsonMatch = resText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ classification: parsed });
  } catch (error: any) {
    console.error("LLM Classification Error:", error);
    return NextResponse.json(
      { error: `Classification failed: ${error.message}` },
      { status: 500 }
    );
  }
}

