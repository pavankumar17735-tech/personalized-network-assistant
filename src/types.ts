export interface UserProfile {
  name: string;
  role: string;
  professionalInterests: string[];
  personalInterests: string[];
  bio: string;
}

export interface AnalyzedThemes {
  topics: { name: string; confidence: number }[];
  keywords: string[];
  skills: string[];
  industries: string[];
  summary: string;
}

export interface Starter {
  id: string;
  title: string;
  text: string;
  whyItWorks: string;
  confidence: number;
  category: 'Icebreaker' | 'Open-ended' | 'Mutual Interest' | 'Career' | 'Technology';
}

export interface ElevatorPitch {
  id: string;
  title: string;
  text: string;
  whenToUse: string;
}

export interface QuickInsight {
  goal: string;
  tactic: string;
  relevance: string;
}

export interface PrepTask {
  id: string;
  task: string;
}

export interface NetworkingSession {
  id: string;
  userProfile: UserProfile;
  eventDescription: string;
  analyzedThemes: AnalyzedThemes;
  starters: Starter[];
  elevatorPitches: ElevatorPitch[];
  tips: string[];
  timestamp: string;
  feedback?: SessionFeedback;
  quickInsights?: QuickInsight[];
  prepChecklist?: PrepTask[];
}

export interface FactCheck {
  id: string;
  query: string;
  status: 'Verified' | 'Partially Verified' | 'Disputed' | 'No Information';
  summary: string;
  sourceUrl: string;
  explanation: string;
  confidence: number;
}

export interface LogEntry {
  id: string;
  actionType: string;
  message: string;
  timestamp: string;
  durationMs?: number;
}

export interface SessionFeedback {
  id: string;
  sessionId: string;
  rating: number;
  comments: string;
  likedStarters: string[];
  timestamp: string;
}
