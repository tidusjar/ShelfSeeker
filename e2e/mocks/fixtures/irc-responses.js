/**
 * IRC Search Response Fixtures
 * Format: !BotCommand filename ::INFO:: size
 */
export const IRC_SEARCH_FIXTURES = {
    'dune': [
        '!SearchBot Frank Herbert - Dune.epub ::INFO:: 2.5MB',
        '!BookLib Frank Herbert - Dune Messiah.epub ::INFO:: 1.8MB',
        '!Bsk Frank Herbert - Children of Dune.pdf ::INFO:: 3.1MB'
    ],
    'brandon sanderson': [
        '!SearchBot Brandon Sanderson - Way of Kings.epub ::INFO:: 4.2MB',
        '!BookLib Brandon Sanderson - Words of Radiance.epub ::INFO:: 5.1MB',
        '!Bsk Brandon Sanderson - Oathbringer.mobi ::INFO:: 6.0MB'
    ],
    'test': [
        '!SearchBot Test Author - Test Book.epub ::INFO:: 1.0MB'
    ],
    'nonexistent': [] // Empty results for testing no-results case
};
/**
 * Get IRC search results for a query
 */
export function getIrcResults(query) {
    const normalizedQuery = query.toLowerCase().trim();
    return IRC_SEARCH_FIXTURES[normalizedQuery] || [];
}
