import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { geminiService } from './server/services/geminiService.ts';
import { wikipediaService } from './server/services/wikipediaService.ts';
import { storageService } from './server/services/storageService.ts';
import { UserProfile, NetworkingSession, SessionFeedback } from './src/types.ts';

// Force dotenv load for local keys if present
import dotenv from 'dotenv';
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  /**
   * Fast Pipeline: Unified event analysis and starter suggestions in ONE LLM call
   */
  app.post('/api/pipeline', async (req, res) => {
    const startTime = Date.now();
    try {
      const { profile, eventDescription } = req.body;
      if (!profile || !eventDescription) {
        return res.status(400).json({ error: 'Missing profile or eventDescription parameters.' });
      }

      // Execute unified Gemini pipeline
      const pipelineResult = await geminiService.generateFullPipeline(profile, eventDescription);

      // Create session
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const session: NetworkingSession = {
        id: sessionId,
        userProfile: profile,
        eventDescription,
        analyzedThemes: pipelineResult.analyzedThemes,
        starters: (pipelineResult.starters || []).map((s: any, idx: number) => ({
          ...s,
          id: `starter-${idx}-${Date.now()}`
        })),
        elevatorPitches: (pipelineResult.elevatorPitches || []).map((p: any, idx: number) => ({
          ...p,
          id: `pitch-${idx}-${Date.now()}`
        })),
        tips: pipelineResult.tips || [],
        timestamp: new Date().toISOString(),
        quickInsights: pipelineResult.quickInsights || [],
        prepChecklist: (pipelineResult.prepChecklist || []).map((taskText: string, idx: number) => ({
          id: `prep-${idx}-${Date.now()}`,
          task: taskText
        }))
      };

      // Save to persistence
      storageService.saveSession(session);

      const durationMs = Date.now() - startTime;
      storageService.addLog(
        'Pipeline Strategy',
        `Successfully generated complete networking playbook for ${profile.name} in ${durationMs}ms`,
        durationMs
      );

      res.status(200).json(session);
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      console.error('Pipeline Error:', error);
      storageService.addLog('Pipeline Error', `Failed generation: ${error.message || error}`, durationMs);
      res.status(500).json({ error: error.message || 'Failed to analyze event and generate strategy.' });
    }
  });

  /**
   * Fact Verification Endpoint: Wikipedia search snippet + Gemini analysis
   */
  app.post('/api/factcheck', async (req, res) => {
    const startTime = Date.now();
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid query parameter.' });
      }

      // Search Wikipedia
      const wiki = await wikipediaService.searchWikipedia(query);

      // Verify with Gemini
      const verified = await geminiService.verifyFactWithGemini(query, wiki.snippet);

      const factCheckResult = {
        id: `factcheck-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        query,
        status: verified.status,
        summary: verified.summary,
        sourceUrl: wiki.url,
        explanation: verified.explanation,
        confidence: verified.confidence
      };

      const durationMs = Date.now() - startTime;
      storageService.addLog(
        'Fact Check',
        `Verified query: "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}" -> Status: ${verified.status}`,
        durationMs
      );

      res.status(200).json(factCheckResult);
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      console.error('Fact Check Error:', error);
      storageService.addLog('Fact Check Error', `Failed factcheck: ${error.message || error}`, durationMs);
      res.status(500).json({ error: error.message || 'Fact-checking verification failed.' });
    }
  });

  /**
   * Save User Session Feedback
   */
  app.post('/api/feedback', (req, res) => {
    try {
      const { sessionId, rating, comments, likedStarters } = req.body;
      if (!sessionId || rating === undefined) {
        return res.status(400).json({ error: 'Missing sessionId or rating parameter.' });
      }

      const feedback: SessionFeedback = {
        id: `feedback-${Date.now()}`,
        sessionId,
        rating,
        comments: comments || '',
        likedStarters: likedStarters || [],
        timestamp: new Date().toISOString()
      };

      storageService.saveFeedback(feedback);
      storageService.addLog('Feedback Received', `User rated session ${sessionId} as ${rating}/5 stars`);

      res.status(200).json({ success: true, feedback });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save feedback.' });
    }
  });

  /**
   * Saved Sessions (History) CRUD
   */
  app.get('/api/history', (req, res) => {
    try {
      const sessions = storageService.getSessions();
      res.status(200).json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve session history.' });
    }
  });

  app.delete('/api/history/:id', (req, res) => {
    try {
      const { id } = req.params;
      storageService.deleteSession(id);
      storageService.addLog('Delete Session', `Deleted historical session with ID: ${id}`);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete session.' });
    }
  });

  app.post('/api/clear', (req, res) => {
    try {
      storageService.clearAllData();
      storageService.addLog('Clear All Data', 'User triggered full data reset and purge.');
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to clear database storage.' });
    }
  });

  /**
   * Logs endpoint
   */
  app.get('/api/logs', (req, res) => {
    try {
      const logs = storageService.getLogs();
      res.status(200).json(logs);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve logs.' });
    }
  });

  /**
   * Aggregated Metrics endpoint for Recharts
   */
  app.get('/api/metrics', (req, res) => {
    try {
      const sessions = storageService.getSessions();
      const feedback = storageService.getFeedback();
      const logs = storageService.getLogs();

      // 1. Rating Distribution (Count of 1,2,3,4,5 stars)
      const ratingsMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      feedback.forEach((f) => {
        if (f.rating >= 1 && f.rating <= 5) {
          ratingsMap[f.rating]++;
        }
      });
      const ratingDistribution = Object.keys(ratingsMap).map((key) => ({
        stars: `${key} Stars`,
        count: ratingsMap[Number(key)]
      }));

      // 2. Action Frequencies from logs
      const actionMap: Record<string, number> = {};
      logs.forEach((log) => {
        actionMap[log.actionType] = (actionMap[log.actionType] || 0) + 1;
      });
      const actionFrequency = Object.keys(actionMap).map((action) => ({
        name: action,
        value: actionMap[action]
      }));

      // 3. Average execution times from logs (filtered by durationMs present)
      const durationLogs = logs.filter((log) => log.durationMs !== undefined);
      const latencyDistribution = durationLogs.slice(0, 15).reverse().map((log) => ({
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        latency: log.durationMs,
        type: log.actionType
      }));

      // 4. Starter Categories count from saved sessions
      const categoryMap: Record<string, number> = {
        'Icebreaker': 0,
        'Open-ended': 0,
        'Mutual Interest': 0,
        'Career': 0,
        'Technology': 0
      };
      sessions.forEach((s) => {
        s.starters.forEach((starter) => {
          if (starter.category in categoryMap) {
            categoryMap[starter.category]++;
          }
        });
      });
      const categoryDistribution = Object.keys(categoryMap).map((cat) => ({
        category: cat,
        count: categoryMap[cat]
      }));

      res.status(200).json({
        totalSessions: sessions.length,
        totalFeedback: feedback.length,
        totalLogs: logs.length,
        ratingDistribution,
        actionFrequency,
        latencyDistribution,
        categoryDistribution
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve analytics metrics.' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Networking Assistant Server] listening at http://localhost:${PORT}`);
  });
}

startServer();
