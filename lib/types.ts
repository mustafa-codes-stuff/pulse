export interface ConversationPart {
  id: string;
  part_type: string;
  body: string | null;
  created_at: number;
  author: {
    id: string;
    type: "admin" | "bot" | "user" | "lead";
    name: string;
    email?: string;
  };
}

export interface IntercomConversation {
  type: "conversation";
  id: string;
  created_at: number;
  updated_at: number;
  waiting_since: number | null;
  snoozed_until: number | null;
  source: {
    type: string;
    subject: string;
    body: string;
    author: {
      type: string;
      name: string;
      email?: string;
    };
    attachments?: unknown[];
  };
  open: boolean;
  state: "open" | "closed" | "snoozed";
  tags: { tags: { id: string; name: string }[] };
  priority: "priority" | "not_priority";
  sla_applied: unknown | null;
  statistics: {
    time_to_assignment: number | null;
    time_to_admin_reply: number | null;
    time_to_first_close: number | null;
    time_to_last_close: number | null;
    median_time_to_reply: number | null;
    count_reopens: number;
    count_assignments: number;
    count_conversation_parts: number;
    handling_time: number;
  };
  conversation_rating: { rating: number; remark?: string } | null;
  title: string;
  custom_attributes: Record<string, unknown>;
  ai_agent_participated: boolean;
  company: unknown | null;
  conversation_parts: {
    conversation_parts: ConversationPart[];
    total_count: number;
  };
}

// Internal wrapped type that includes the source filename
export interface PulseConversation extends IntercomConversation {
  _sourceFilename: string;
}
