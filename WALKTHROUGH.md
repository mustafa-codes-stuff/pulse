# Pulse Dashboard: Walkthrough

This document provides a concise overview of all the features, widgets, and functionalities available on the Pulse dashboard, designed to help you navigate and understand your support data at a glance.

## 1. Global Controls & Navigation
At the very top of the dashboard, you have tools to filter and contextualize your entire view.
- **Dataset Manager (Dataset Pill):** Displays the currently active dataset. Clicking this pill opens the Dataset Manager, allowing you to upload new JSON files, switch between different datasets, and manage your data sources.
- **View Toggles (Engineering / Support Tabs):** Two dedicated tabs that tailor the dashboard's focus. 
  - **Support View:** Optimized for Support Managers, highlighting agent performance, SLAs, and customer frustration metrics.
  - **Engineering View:** Optimized for Product and Engineering teams, emphasizing bugs, feature requests, anomaly detection, and deep technical summaries.
- **Human Conversations Toggle:** A master filter that allows you to isolate tickets handled by human agents versus those handled entirely by AI/bots, helping you evaluate human performance specifically.

## 2. High-Level Metrics (KPI Cards)
These cards provide an instant pulse check on your overall support health.
- **Total Volume:** Total number of conversations loaded in the current dataset.
- **Median Reply Time:** The median time it takes for an agent to send the first reply to a ticket.
- **Reopen Rate:** Percentage of tickets that were marked closed but subsequently reopened by the customer.
- **Friction Rate:** The percentage of conversations exhibiting high escalation risk or customer frustration.
- **Avg CSAT:** The average Customer Satisfaction score across all rated conversations.

## 3. Top Customer Issues
A categorization engine that breaks down incoming support tickets to help identify trending problems.
- **Categories:** Toggle between **All signals**, **Bugs**, **Feature Requests**, and **Other**.
- **Friction & Confidence:** Each issue category displays a "Friction" metric (percentage of tickets showing frustration) and a "Low Confidence" indicator (how many tickets the AI was uncertain about categorizing).

## 4. Incoming Ticket Volume (Timeline)
A time-series chart visualizing your ticket traffic and response efficiency over the selected period.
- **Volume & SLA:** Displays total volume over time, highlighting tickets that breached SLA (e.g., response time > 1 hour) in red.
- **Business Hours:** The chart background distinguishes between business hours (white/clear) and outside business hours (shaded), helping you correlate spikes with staffing levels.

## 5. Attention Required
An AI-curated shortlist of critical tickets that demand immediate manual intervention.
- Flags urgent issues such as **Escalation Risks**, **Legal Risks**, and **Executive Escalations**, providing a one-click jump to the conversation.

## 6. More Service Metrics
A dual-tab widget focused on qualitative support insights and deeper KPI analysis.
- **Frustration History:** A chronological feed of specific ticket moments where customers expressed high frustration, allowing you to read the exact quotes.
- **Service KPIs:** Secondary operational metrics, such as Resolution Rate, Average Handle Time, and First Contact Resolution (FCR).

## 7. Agent Performance
A dual-tab widget dedicated to evaluating and optimizing your support team's output.
- **Performance Metrics:** A leaderboard ranking agents by volume, accompanied by their individual median reply times, CSAT scores, Friction rates, and Reopen rates.
- **Coverage Heatmap:** A visual grid showing ticket handling volume per agent by hour of the day. Useful for identifying coverage gaps and optimizing shift schedules.

## 8. Ticket State & Sources
Visual breakdowns (pie/donut charts) of your ticket ecosystem.
- **Ticket State:** Shows the current lifecycle status of the dataset (e.g., Open, Pending, Closed).
- **Source Channel:** Shows where tickets are originating from (e.g., Email, Chat, Web Form).

## 9. Detailed Conversation List
A comprehensive, filterable list of all support conversations for deep-dive investigations.
- Includes AI-generated summaries, sentiment indicators, Risk Levels, and tags.
- Clicking a conversation opens a detailed modal with the full transcript, AI insights, and actionable context.
