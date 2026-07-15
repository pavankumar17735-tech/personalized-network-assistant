import fs from 'fs';
import path from 'path';
import { NetworkingSession, LogEntry, SessionFeedback } from '../../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure data directory and files exist
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export const storageService = {
  getSessions(): NetworkingSession[] {
    ensureStorage();
    try {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveSession(session: NetworkingSession): void {
    ensureStorage();
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index > -1) {
      sessions[index] = session;
    } else {
      sessions.unshift(session); // Add to beginning
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  },

  deleteSession(id: string): void {
    ensureStorage();
    let sessions = this.getSessions();
    sessions = sessions.filter((s) => s.id !== id);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  },

  getFeedback(): SessionFeedback[] {
    ensureStorage();
    try {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveFeedback(feedback: SessionFeedback): void {
    ensureStorage();
    const items = this.getFeedback();
    items.unshift(feedback);
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(items, null, 2), 'utf-8');

    // Also update the session with its feedback
    const sessions = this.getSessions();
    const session = sessions.find((s) => s.id === feedback.sessionId);
    if (session) {
      session.feedback = feedback;
      this.saveSession(session);
    }
  },

  getLogs(): LogEntry[] {
    ensureStorage();
    try {
      const data = fs.readFileSync(LOGS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addLog(actionType: string, message: string, durationMs?: number): LogEntry {
    ensureStorage();
    const log: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      actionType,
      message,
      timestamp: new Date().toISOString(),
      durationMs
    };
    const logs = this.getLogs();
    logs.unshift(log);
    // Limit to last 500 logs to prevent file bloat
    if (logs.length > 500) {
      logs.pop();
    }
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    return log;
  },

  clearAllData(): void {
    ensureStorage();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2), 'utf-8');
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
};
