# Pulse | Support Conversation Intelligence

Pulse is a browser-based, interactive dashboard built for deep-diving into your support conversations (specifically designed to handle JSON exports from platforms like Intercom). It instantly processes massive log files entirely in your browser—meaning your customer data never leaves your machine—and automatically surfaces insights for both Support Operations and Engineering teams.

## Key Features

- **100% Client-Side Processing**: Fast, secure parsing via Web Workers. Data stays completely on your local machine.
- **Support Ops Dashboard**: 
  - Track total conversation volume, median reply times, reopen rates, and CSAT scores.
  - Visualize ticket states (Open/Closed/Snoozed) and source channels (Chat vs. Email).
  - Analyze snoozed tickets to see how many are blocking on customer attachments vs. standard follow-ups.
- **Engineering & Product Dashboard**:
  - **Heuristic Classification**: Automatically tags tickets as "Bug Reports," "Feature Requests," or "Other" by analyzing keywords in the title and body.
  - **Theme Clusters**: Groups and surfaces the most common topics using the conversation's internal AI-generated titles.
  - **Deep Systemic Issues**: Flags the top most complex tickets based on back-and-forth message count.
  - **Anomaly Detection**: Highlights dates that had an unusually high spike in incoming tickets (2+ standard deviations above the mean).
- **Interactive Data Explorer**:
  - Click on *any* chart, slice, or metric to open a modal that instantly displays the exact conversations behind that data.
  - Tables include sorting and filtering, and you can seamlessly jump into the raw JSON payload for any individual conversation for deep debugging.

## Data Processing & Privacy

- **Supported Data Formats**: Pulse expects JSON export arrays modeled after Intercom's conversation structure (containing fields like `type: "conversation"`, `created_at`, `source.body`, `statistics`, etc.).
- **No External AI APIs**: We completely dropped the use of live external LLMs (like OpenAI or Gemini). Pulse does not send your data to any third-party AI services.
- **Fast Local Heuristics**: Features like "Bug" and "Feature" detection run locally in your browser using fast keyword scanning. Widgets like "Theme Clusters" rely entirely on pre-existing custom attributes (like `AI Title`) that were already present in your JSON export.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Icons/UI**: Custom dashboard UI with a dark/light mode toggle.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- **Upload Real Data**: On the homepage, simply drag and drop your Intercom JSON export files. Pulse will parse them and take you to the dashboard.
- **Explore Sample Data**: Don't have an export handy? Click "Explore with sample data" to load a robust set of 100 randomly generated dummy conversations to preview the dashboard's capabilities.
