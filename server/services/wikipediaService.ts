import { FactCheck } from '../../src/types.ts';

interface WikipediaSearchResult {
  title: string;
  snippet: string;
  pageid: number;
}

export const wikipediaService = {
  /**
   * Search Wikipedia and return matching excerpts plus source URL
   */
  async searchWikipedia(query: string): Promise<{ snippet: string; url: string }> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&origin=*`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Wikipedia search failed with status: ${response.status}`);
      }

      const data = await response.json();
      const results: WikipediaSearchResult[] = data.query?.search || [];

      if (results.length === 0) {
        return {
          snippet: 'No matching articles or records found on Wikipedia for this claim.',
          url: 'https://en.wikipedia.org'
        };
      }

      // Concatenate top 3 snippets to provide rich context
      const snippets = results
        .slice(0, 3)
        .map((r) => `[Title: ${r.title}] ... ${r.snippet.replace(/<\/?[^>]+(>|$)/g, '')} ...`) // Strip HTML tags
        .join('\n\n');

      const primaryTitle = results[0].title;
      const primaryUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(primaryTitle.replace(/ /g, '_'))}`;

      return {
        snippet: snippets,
        url: primaryUrl
      };
    } catch (error: any) {
      console.error('Wikipedia Search Error:', error);
      return {
        snippet: `Error connecting to Wikipedia search API: ${error.message || error}`,
        url: 'https://en.wikipedia.org'
      };
    }
  }
};
