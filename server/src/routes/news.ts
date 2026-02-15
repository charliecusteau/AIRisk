import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { get, all, run, transaction } from '../db/helpers';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/news - Return cached alerts with their impacts, scoped by user
router.get('/', (req: Request, res: Response) => {
  const userId = req.session.userId;
  const minRelevance = Number(req.query.min_relevance) || 6;

  const alerts = all(
    'SELECT * FROM news_alerts WHERE relevance_score >= ? AND user_id = ? ORDER BY relevance_score DESC, published_date DESC',
    minRelevance, userId,
  );

  const alertsWithImpacts = alerts.map((alert: any) => {
    const impacts = all(
      `SELECT nai.portfolio_id, c.name as company_name, nai.impact_explanation
       FROM news_alert_impacts nai
       JOIN portfolio p ON nai.portfolio_id = p.id
       JOIN assessments a ON p.assessment_id = a.id
       JOIN companies c ON a.company_id = c.id
       WHERE nai.alert_id = ?`,
      alert.id,
    );
    return { ...alert, impacts };
  });

  res.json(alertsWithImpacts);
});

// GET /api/news/status - Return scan status, scoped by user
router.get('/status', (req: Request, res: Response) => {
  const userId = req.session.userId;

  const latest = get<{ scanned_at: string }>(
    'SELECT scanned_at FROM news_alerts WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 1',
    userId,
  );
  const countRow = get<{ count: number }>('SELECT COUNT(*) as count FROM news_alerts WHERE user_id = ?', userId);
  const alertCount = countRow?.count || 0;

  let isStale = true;
  if (latest?.scanned_at) {
    const scannedAt = new Date(latest.scanned_at + 'Z');
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    isStale = scannedAt < fourHoursAgo;
  }

  res.json({
    last_scanned_at: latest?.scanned_at || null,
    alert_count: alertCount,
    is_stale: isStale,
  });
});

// POST /api/news/scan - Trigger a new scan via SSE (incremental), scoped by user
router.post('/scan', async (req: Request, res: Response) => {
  const userId = req.session.userId!;

  // Get this user's portfolio companies
  const portfolio = all(`
    SELECT
      p.id as portfolio_id, c.name, c.sector,
      a.composite_score, a.composite_rating,
      a.domain1_rating, a.domain2_rating, a.domain3_rating, a.domain4_rating
    FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    JOIN companies c ON a.company_id = c.id
    WHERE a.status = 'completed' AND p.user_id = ?
  `, userId);

  if (portfolio.length === 0) {
    res.status(400).json({ error: 'No portfolio companies to scan for' });
    return;
  }

  // Determine last scan date for incremental search (per user)
  const lastScan = get<{ scanned_at: string }>(
    'SELECT scanned_at FROM news_alerts WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 1',
    userId,
  );

  // Gather existing headlines to deduplicate (per user)
  const existingHeadlines = new Set(
    all<{ headline: string }>('SELECT headline FROM news_alerts WHERE user_id = ?', userId).map(r => r.headline.toLowerCase()),
  );

  const isFirstScan = !lastScan;
  let searchSince: string;

  if (isFirstScan) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    searchSince = d.toISOString().split('T')[0];
  } else {
    searchSince = lastScan.scanned_at.split('T')[0];
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('progress', {
      message: isFirstScan
        ? 'First scan — searching last 30 days of AI news...'
        : `Incremental scan — searching for news since ${searchSince}...`,
    });

    const portfolioContext = portfolio.map((p: any) =>
      `- ${p.name} (Sector: ${p.sector || 'Unknown'}, Risk Rating: ${p.composite_rating || 'N/A'}, Score: ${p.composite_score || 'N/A'})`,
    ).join('\n');

    const companyNames = portfolio.map((p: any) => p.name);

    const client = new Anthropic();

    const systemPrompt = `You are a competitive intelligence analyst specializing in AI disruption risk for software companies. You track AI product launches, partnerships, funding rounds, and feature announcements that could impact software companies.

Your job is to find recent, real news about competitor moves from:
(a) Foundation labs (Anthropic, OpenAI, Google DeepMind, Meta AI, xAI, Mistral, Cohere)
(b) AI-native startups (e.g. Cursor, Jasper, Harvey, Glean, etc.)
(c) Major incumbents adding AI capabilities (Microsoft, Google, Salesforce, Adobe, etc.)

...that create competitive pressure on the portfolio companies listed below.

PORTFOLIO COMPANIES:
${portfolioContext}

IMPORTANT: Only search for news published on or after ${searchSince}. Do NOT include older news.
${isFirstScan ? '' : 'This is an incremental scan. Only return NEW news items since the date above.'}

INSTRUCTIONS:
1. Use web search to find AI-related competitive news published since ${searchSince}.
2. For each news item, determine which portfolio companies it impacts and why.
3. Rate relevance 1-10 (10 = most impactful). Only include items with relevance >= 5.
4. Be selective — quality over quantity. Max 20 alerts.
5. Return ONLY valid JSON, no markdown fences or commentary.

Return this exact JSON structure:
{
  "alerts": [
    {
      "headline": "Short headline of the news",
      "source": "Publication name (e.g. TechCrunch, Reuters)",
      "source_url": "URL of the article if available, or null",
      "published_date": "YYYY-MM-DD or null if unknown",
      "summary": "2-3 sentence description of the news and its significance",
      "competitor": "Name of the company making the move",
      "competitor_type": "foundation_lab" | "ai_native" | "incumbent",
      "relevance_score": 7,
      "impacted_companies": [
        {
          "company_name": "Exact name from portfolio",
          "impact_explanation": "1-2 sentences explaining how this news impacts this specific company"
        }
      ]
    }
  ]
}`;

    sendEvent('progress', { message: 'Searching for recent AI competitive news...' });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search', max_uses: 15 } as any],
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Search for AI competitive news published since ${searchSince} that could impact these portfolio companies: ${companyNames.join(', ')}. Return the structured JSON as instructed.`,
        },
      ],
    });

    sendEvent('progress', { message: 'Processing search results...' });

    // Extract text content — use the LAST text block containing JSON
    const textBlocks: string[] = [];
    for (const block of response.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text);
      }
    }

    logger.info(`News scan: got ${response.content.length} content blocks, ${textBlocks.length} text blocks, stop_reason=${response.stop_reason}`);

    let parsed: any = null;
    for (let i = textBlocks.length - 1; i >= 0; i--) {
      let candidate = textBlocks[i].trim();
      candidate = candidate.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '');

      const jsonMatch = candidate.match(/\{[\s\S]*"alerts"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          logger.info(`News scan: parsed JSON from text block ${i}, alerts: ${parsed.alerts?.length}`);
          break;
        } catch {
          logger.warn(`News scan: found alerts pattern in block ${i} but JSON parse failed`);
        }
      }
    }

    if (!parsed) {
      logger.error('Failed to parse Claude response as JSON', {
        blockCount: textBlocks.length,
        lastBlock: textBlocks[textBlocks.length - 1]?.substring(0, 500) || 'NO TEXT BLOCKS',
      });
      sendEvent('error', { message: 'Failed to parse AI response. Please try again.' });
      res.end();
      return;
    }

    const newAlerts = (parsed.alerts || []).filter(
      (a: any) => !existingHeadlines.has(a.headline?.toLowerCase()),
    );

    const skipped = (parsed.alerts || []).length - newAlerts.length;
    if (skipped > 0) {
      logger.info(`News scan: skipped ${skipped} duplicate alerts`);
    }

    sendEvent('progress', { message: `Found ${newAlerts.length} new items${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}. Saving...` });

    // Build a lookup of portfolio company names to portfolio IDs
    const nameToPortfolioId: Record<string, number> = {};
    for (const p of portfolio) {
      nameToPortfolioId[(p as any).name.toLowerCase()] = (p as any).portfolio_id;
    }

    transaction(() => {
      // Prune alerts older than 90 days to prevent unbounded growth
      run(`DELETE FROM news_alert_impacts WHERE alert_id IN (
        SELECT id FROM news_alerts WHERE published_date < date('now', '-90 days') AND user_id = ?
      )`, userId);
      run("DELETE FROM news_alerts WHERE published_date < date('now', '-90 days') AND user_id = ?", userId);

      // Insert new alerts
      for (const alert of newAlerts) {
        const result = run(
          `INSERT INTO news_alerts (headline, source, source_url, published_date, summary, competitor, competitor_type, relevance_score, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          alert.headline,
          alert.source || null,
          alert.source_url || null,
          alert.published_date || null,
          alert.summary,
          alert.competitor || null,
          alert.competitor_type || null,
          alert.relevance_score || 5,
          userId,
        );

        const alertId = result.lastInsertRowid;

        if (Array.isArray(alert.impacted_companies)) {
          for (const impact of alert.impacted_companies) {
            const portfolioId = nameToPortfolioId[impact.company_name?.toLowerCase()];
            if (portfolioId) {
              run(
                'INSERT INTO news_alert_impacts (alert_id, portfolio_id, impact_explanation) VALUES (?, ?, ?)',
                alertId,
                portfolioId,
                impact.impact_explanation || '',
              );
            }
          }
        }
      }
    });

    const totalCount = get<{ count: number }>('SELECT COUNT(*) as count FROM news_alerts WHERE user_id = ?', userId)?.count || 0;
    sendEvent('complete', { alert_count: totalCount, new_count: newAlerts.length });
  } catch (error: any) {
    logger.error('News scan failed', error);
    sendEvent('error', { message: error.message || 'Scan failed' });
  }

  res.end();
});

export default router;
