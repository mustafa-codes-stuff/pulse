import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; 

const SYSTEM_PROMPT = `You are an expert customer support analyst for an AI photo generation app.
Your task is to analyze multiple customer support conversations and extract actionable insights for each.

Output STRICT JSON ONLY. The output MUST be a valid JSON array of objects, where each object corresponds to a conversation provided in the prompt.
Do not include any text or markdown formatting outside the JSON array.

Schema for EACH object in the array:
{
  "id": "string (Must exactly match the Conversation ID provided)",
  "category": "string",
  "has_frustration": boolean,
  "frustration_reason": "string|null",
  "is_dual_intent": boolean,
  "also_relevant_to": ["string"],
  "cross_tag_reasons": {
    "engineering": "string|null",
    "product_quality": "string|null"
  },
  "confidence": "high|low",
  "support_insights": {
     "customer_experience_rating": 1,
     "experience_degradation_reason": "string|null",
     "agent_improvement_suggestion": "string|null"
  },
  "engineering_insights": {
     "technical_issue_type": "string|null",
     "specific_failure_point": "string|null",
     "engineering_action_item": "string|null"
  },
  "user_goal": "string",
  "churn_risk_1_to_10": 1
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

"technical_issue_type" MUST be 1 of: "bug", "ui_friction", "ai_generation", "missing_feature", "none".

Rules:
1. "has_frustration": true only if the user uses explicit angry words, profanity, or extreme dissatisfaction.
2. "is_dual_intent": true if the conversation spans 2 totally distinct issues (e.g. refund AND bug).
3. "also_relevant_to": include "engineering" if it is a technical bug/crash; include "product_quality" if it is a bad AI generation.
4. "cross_tag_reasons": provide a short direct quote from the user that justifies the tag.
5. "customer_experience_rating": Score 1-10 on how well the agent handled this (10 is excellent).`;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey || anthropicKey === "" || anthropicKey === "your_anthropic_api_key_here") {
    return NextResponse.json({ error: "Invalid or missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  try {
    const { conversations } = await req.json(); // Array of { id, text }
    
    if (!Array.isArray(conversations) || conversations.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results: Record<string, any> = {};
    
    // We will batch 10 conversations into a SINGLE prompt.
    const CHUNK_SIZE = 10; 
    
    console.log(`Starting LLM prompt batching for ${conversations.length} conversations...`);
    
    const chunks = [];
    for (let i = 0; i < conversations.length; i += CHUNK_SIZE) {
      chunks.push(conversations.slice(i, i + CHUNK_SIZE));
    }
    
    // Process chunks with a concurrency limit of 3 to avoid Anthropic rate limits
    const CONCURRENCY = 3;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);
      
      await Promise.all(batch.map(async (chunk, batchIdx) => {
        const chunkIdx = i + batchIdx;
        console.log(`Sending API call ${chunkIdx + 1}/${chunks.length} containing ${chunk.length} conversations...`);
        
        const combinedPrompt = chunk.map(conv => `[Conversation ID: ${conv.id}]\n${conv.text}`).join('\n\n---\n\n');

        try {
          const response = await fetch(ANTHROPIC_URL, {
            method: "POST",
            headers: {
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json"
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 4000,
              system: SYSTEM_PROMPT,
              messages: [
                { role: "user", content: `Analyze the following conversations and return a JSON array containing the exact analysis for each one:\n\n${combinedPrompt}` }
              ]
            }),
            signal: AbortSignal.timeout(120000)
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Anthropic API returned ${response.status}: ${errText}`);
          }

          const data = await response.json();
          const textBlock = data.content?.find((block: any) => block.type === "text");
          const resText = textBlock?.text;

          if (resText) {
            let jsonText = resText;
            const jsonBlockMatch = resText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch) {
              jsonText = jsonBlockMatch[1];
            } else {
              const arrayMatch = resText.match(/\[\s*\{[\s\S]*\}\s*\]/);
              if (arrayMatch) {
                jsonText = arrayMatch[0];
              }
            }
            
            try {
              const parsedArray = JSON.parse(jsonText);
              if (Array.isArray(parsedArray)) {
                 parsedArray.forEach((item: any) => {
                   if (item.id || item.conversation_id) {
                     results[item.id || item.conversation_id] = item;
                   }
                 });
              } else {
                 console.error(`LLM returned JSON, but it is not an array:`, parsedArray);
                 throw new Error(`LLM did not return a JSON array. Raw response: ${resText}`);
              }
            } catch (e: any) {
               console.error(`Failed to parse JSON array from API Call ${chunkIdx + 1}`, jsonText.substring(0, 100));
               throw new Error(`LLM returned invalid JSON. Raw response: ${resText}`);
            }
          }
          console.log(`Completed API call ${chunkIdx + 1}/${chunks.length}.`);
        } catch (err: any) {
          console.error(`Error on API Call ${chunkIdx + 1}:`, err.message || err);
          throw err;
        }
      }));
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Batch Classification Error:", error);
    return NextResponse.json(
      { error: `Batch Classification failed: ${error.message}` },
      { status: 500 }
    );
  }
}
