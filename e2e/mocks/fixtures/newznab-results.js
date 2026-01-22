/**
 * Newznab Search Response Fixtures
 * Scene release format: Author.Name-Book.Title-RETAIL-FORMAT-YEAR
 */
export const NZB_SEARCH_FIXTURES = {
    'dune': [
        {
            title: 'Frank.Herbert-Dune-RETAIL-EPUB-2024',
            guid: 'dune-guid-123',
            size: 2621440 // 2.5MB
        },
        {
            title: 'Frank.Herbert-Dune.Messiah-RETAIL-EPUB-2024',
            guid: 'dune-messiah-guid-456',
            size: 1887437 // 1.8MB
        }
    ],
    'brandon sanderson': [
        {
            title: 'Brandon.Sanderson-Way.of.Kings-RETAIL-EPUB-2024',
            guid: 'wok-guid-789',
            size: 4404019 // 4.2MB
        },
        {
            title: 'Brandon.Sanderson-Words.of.Radiance-RETAIL-EPUB-2024',
            guid: 'wor-guid-012',
            size: 5349038 // 5.1MB
        }
    ],
    'test': [
        {
            title: 'Test.Author-Test.Book-RETAIL-EPUB-2024',
            guid: 'test-guid-345',
            size: 1048576 // 1MB
        }
    ],
    'nonexistent': [] // Empty results for testing
};
/**
 * Get NZB search results for a query
 */
export function getNzbResults(query) {
    const normalizedQuery = query.toLowerCase().trim();
    return NZB_SEARCH_FIXTURES[normalizedQuery] || [];
}
/**
 * Generate Newznab XML for search results
 */
export function generateNewznabXml(results, port) {
    const items = results.map(result => `
    <item>
      <title>${result.title}</title>
      <link>http://localhost:${port}/api?t=get&amp;id=${result.guid}</link>
      <guid>${result.guid}</guid>
      <pubDate>Mon, 01 Jan 2024 00:00:00 +0000</pubDate>
      <newznab:attr name="size" value="${result.size}"/>
      <newznab:attr name="category" value="7000"/>
    </item>
  `).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:newznab="http://www.newznab.com/DTD/2010/feeds/attributes/">
  <channel>
    <title>Test NZB Provider</title>
    <description>Mock Newznab API for testing</description>
    ${items}
  </channel>
</rss>`;
}
/**
 * Generate a mock NZB file
 */
export function generateNzbFile(guid, filename) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nzb PUBLIC "-//newzBin//DTD NZB 1.1//EN" "http://www.newzbin.com/DTD/nzb/nzb-1.1.dtd">
<nzb xmlns="http://www.newzbin.com/DTD/2003/nzb">
  <head>
    <meta type="title">${filename}</meta>
  </head>
  <file poster="test@example.com" date="1234567890" subject="${filename}">
    <groups>
      <group>alt.binaries.ebook</group>
    </groups>
    <segments>
      <segment bytes="102400" number="1">test-segment-${guid}</segment>
    </segments>
  </file>
</nzb>`;
}
