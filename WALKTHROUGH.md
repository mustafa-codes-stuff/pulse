# Pulse Dashboard: Widget Walkthrough

## Global Controls
- **Dataset Manager (Dataset Pill):** Displays the active dataset. Clicking it allows you to upload new JSON files, which are parsed as `PulseConversation` arrays and stored locally in IndexedDB.
- **Hide no-reply conversations:** A toggle that filters the dataset in memory to exclude conversations where `statistics.count_admin_replies === 0`, ensuring metrics focus only on actionable, handled tickets.

## Support & Ops View

- **Top Metrics (KPI Cards):** Three high-level statistics: Total Volume, Median Reply Time, and Reopen Rate. Computed by aggregating the active dataset, finding the median of `statistics.time_to_admin_reply`, and calculating the percentage of tickets with `statistics.count_reopens > 0`.
- **Needs attention:** Flags critical issues requiring immediate action. It scans for SLA breaches (reply times exceeding the P90 threshold), checks for `snoozed_until` dates that are in the past, and uses an internal heuristic engine (`hasFrustrationPattern`) to detect unresolved frustration in customer messages after an agent's last reply.
- **Top customer issues:** A quick summary card highlighting the three most prominent ticket categories. It relies on an internal NLP classifier (`classifyConversation`) that evaluates the ticket's title and body text dynamically.
- **Response times:** A bar chart visualizing response data, grouped by mapping `statistics.time_to_admin_reply` and creation timestamps into hourly buckets and percentile distributions.
- **More service metrics:** A dual-tab widget. "Frustration History" uses keyword heuristics to extract specific message parts where customers expressed frustration. "Service KPIs" aggregates state transitions (e.g., time to resolution).
- **Agent Performance:** A dual-tab widget. "Performance Metrics" iterates through conversation parts, aggregating turns, reply times, and associated customer sentiment grouped by `author.name`. "Coverage Heatmap (PST)" maps agent activity timestamps into 24-hour buckets.
- **Raw Conversations:** A detailed list of the raw `PulseConversation` objects. It combines metadata, state, and a dynamically calculated composite Risk Level based on urgency heuristics and sentiment.

## Engineering & Product View

- **Product signals needing review:** Automatically highlights anomalous volume spikes on specific dates. It achieves this by aggregating daily ticket volume and applying a Z-score based anomaly detection algorithm (`detectSpikes`) to find statistical outliers.

## Recent UI Clarifications & Enhancements
- **Context-Aware Modal Columns:** The "Risk Level" column is now intelligently hidden when viewing conversations inside the Needs Attention modal. This prevents the "Medium Risk" label from mentally competing with the "ACTION REQUIRED" badge on the main panel.
- **Explicit Frustration Tags:** Any conversation containing a frustrated response now proudly displays a `⚠ Frustrated Response` tag directly on the row itself. This ensures that when a user clicks the row, the auto-scroll feature feels like a helpful shortcut rather than a confusing mix-up.
- **Delayed Tooltips:** Escalation Risk badges and Severity badges across the app now feature informative custom tooltips with a slight `delay-300` appearance, making them easier to digest without cluttering the screen during fast mouse movements.
- **Signal Categorization (All signals / Bugs / Feature Requests / Other):** A list categorizing conversations. It aggregates the internal NLP classifications, calculates a "Friction" percentage derived from the frustration heuristic, and tracks classification confidence scores.
- **Evidence Panel:** A drill-down view that opens when selecting a specific issue category. It filters the dataset based on the internal classification string, displaying the underlying conversations and their Risk Levels. Now loaded as a collapsed summary card rather than an auto-expanding panel to match the rest of the Engineering dashboard.
- **Cross-Tagged Support Tickets (Engineering):** Support and Billing tickets (e.g., Refund Requests, Subscriptions) that contain genuine technical malfunction keywords (e.g., "stuck on", "error message", "freezing") are dynamically cross-tagged using the `also_relevant_to: ['engineering']` array. These tickets are surfaced inside the Bugs tab with a keyword reason badge, alerting engineers to technical blockers without polluting primary support categories.
- **Product Quality Signals:** A dedicated section capturing likeness and output quality feedback (e.g., "morphed", "don't look natural", "redo my headshots") extracted dynamically from support-level categories (like Refunds or Cancellations). Badges clearly display the concise, exact keyword match rather than the full sentence.
