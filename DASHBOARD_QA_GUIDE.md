# Pulse Dashboard: QA & Architecture Guide

This document explains the core data processing mechanisms (like deduplication) and provides a breakdown of every widget across the Support and Engineering dashboards. This guide serves as a reference for QA testing and understanding the application's data flow.

## 1. Data Ingestion & Deduplication (How it Works)

When users upload JSON snapshots of Intercom conversations via the **Dropzone**, the app processes them entirely client-side using Web Workers to prevent UI freezing.

### Deduplication Logic
Because daily snapshots often contain overlapping conversations, the app automatically deduplicates the dataset before saving it to IndexedDB or sending it to the AI for classification.
- **Where it happens:** `components/upload/Dropzone.tsx`
- **How it works:** The app extracts the unique `id` from every conversation object across all uploaded files. It iterates through the combined array and adds each `id` to a `Set`. If an `id` is already in the `Set`, the conversation is discarded. This ensures that only one unique copy of a conversation ever enters the processing pipeline, preventing double-counting in metrics.

---

## 2. Support Dashboard Widgets

The Support tab (`/support`) focuses on customer experience, agent performance, and broad issue categorization.

| Widget | Purpose & Logic | QA Validation |
|--------|-----------------|---------------|
| **Support Metrics Cards** | High-level KPIs (Total Conversations, Avg CSAT, Total Reopened, High Friction). | Validate that the numbers match the total dataset length and that CSAT averages correctly handle null values. |
| **Attention Callouts** | Flags urgent subsets of data (e.g., "Frustrated + Needs Human", "Dual Intent"). Powered by the LLM's `has_frustration` and `is_dual_intent` boolean flags. | Click "View Evidence" to ensure the filtered list only shows conversations meeting these criteria. |
| **Top Customer Issues** | Groups conversations by their primary LLM `category` (e.g., Attribute Mismatch, Auth Access). Calculates Churn Risk based on volume and CSAT. | Click a category to open the Evidence Panel. Ensure the "Classification" column is hidden in the detailed view to prevent redundancy. |
| **Issue Leaderboard** | Ranks issues across tabs (All, Bugs, Features, Billing). Ranks are sorted by a computed `painIndex` (Volume + Reopens + Low CSAT). | Verify the sorting order (highest pain index should be #1). |
| **Agent Leaderboard & Heatmap** | Aggregates performance by Agent name. Calculates Avg Turns, CSAT, Reopen Rate, and Friction generation per agent. | Hover over an agent's stats in the modal to ensure tooltips render cleanly with the correct z-index. |

---

## 3. Engineering Dashboard Widgets

The Engineering tab (`/engineering`) filters out general support noise and focuses exclusively on technical issues, bugs, and feature requests.

| Widget | Purpose & Logic | QA Validation |
|--------|-----------------|---------------|
| **Engineering Metrics Cards** | High-level technical KPIs (Bug Reports, Feature Requests, Technical Friction). Powered by filtering for specific LLM categories. | Verify that the Bug Reports count perfectly matches the sum of bug-related categories. |
| **Product Quality Summary** | Analyzes the `engineering_insights` from the LLM. Groups conversations by `technical_issue_type` (e.g., "bug", "ui_friction", "missing_feature"). | Verify that clicking into a sub-category properly filters the Engineering Evidence Panel below. |
| **Service Metrics Insights** | Highlights specific failure points (e.g., "app crash on upload", "payment gateway timeout") extracted by the LLM's `specific_failure_point`. | Check that the textual summaries make logical sense based on the underlying raw conversation text. |
| **Flagged Moments** | Highlights conversations with extremely high technical friction or explicit mentions of data loss / crashes. | Read the conversation threads to confirm the severity matches the flag. |
| **Engineering Evidence Panel** | The filtered table of conversations. By default, it only shows conversations cross-tagged for `engineering` or `product_quality`. | Validate that general support inquiries (like billing questions) do NOT appear in this list unless they have a dual technical intent. |

---

## 4. LLM Analysis Pipeline

When conversations are ingested, any conversation missing an `llm_classification` object is sent to the Anthropic API via the Next.js API routes (`/api/classify-batch`). 

- **Batching:** The app batches 10 conversations into a single prompt to save on API overhead.
- **Concurrency:** It runs 3 batches concurrently to maximize speed while respecting Anthropic's rate limits.
- **Data Extracted:** The LLM extracts a strict JSON schema including category, frustration boolean, churn risk, and specific cross-tags for Engineering.
