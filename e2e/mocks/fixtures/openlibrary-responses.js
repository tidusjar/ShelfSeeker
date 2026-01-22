/**
 * OpenLibrary API Response Fixtures
 * These mock responses are designed to enrich search results with metadata
 */
/**
 * Mock OpenLibrary search responses mapped by query
 * Query format: "title:TITLE author:AUTHOR"
 */
export const OPENLIBRARY_FIXTURES = {
    // Dune by Frank Herbert
    'title:Dune author:Frank Herbert': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL893721W',
                title: 'Dune',
                author_name: ['Frank Herbert'],
                first_publish_year: 1965,
                isbn: ['9780441172719', '0441172717'],
                publisher: ['Ace Books', 'Penguin Publishing Group'],
                number_of_pages_median: 688,
                language: ['eng'],
                subject: ['Science Fiction', 'Fantasy', 'Adventure', 'Politics', 'Ecology'],
                cover_i: 8593661,
                cover_edition_key: 'OL7604302M',
                ratings_average: 4.23,
                ratings_count: 12567
            }
        ]
    },
    // Dune Messiah by Frank Herbert
    'title:Dune Messiah author:Frank Herbert': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL893722W',
                title: 'Dune Messiah',
                author_name: ['Frank Herbert'],
                first_publish_year: 1969,
                isbn: ['9780441172696', '0441172695'],
                publisher: ['Ace Books'],
                number_of_pages_median: 331,
                language: ['eng'],
                subject: ['Science Fiction', 'Fantasy', 'Politics'],
                cover_i: 8593662,
                cover_edition_key: 'OL7604303M',
                ratings_average: 4.1,
                ratings_count: 8234
            }
        ]
    },
    // Children of Dune by Frank Herbert
    'title:Children of Dune author:Frank Herbert': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL893723W',
                title: 'Children of Dune',
                author_name: ['Frank Herbert'],
                first_publish_year: 1976,
                isbn: ['9780441104024', '0441104029'],
                publisher: ['Ace Books'],
                number_of_pages_median: 444,
                language: ['eng'],
                subject: ['Science Fiction', 'Fantasy', 'Adventure'],
                cover_i: 8593663,
                cover_edition_key: 'OL7604304M',
                ratings_average: 4.15,
                ratings_count: 7123
            }
        ]
    },
    // Way of Kings by Brandon Sanderson
    'title:Way of Kings author:Brandon Sanderson': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL15832982W',
                title: 'The Way of Kings',
                author_name: ['Brandon Sanderson'],
                first_publish_year: 2010,
                isbn: ['9780765326355', '0765326353'],
                publisher: ['Tor Books'],
                number_of_pages_median: 1007,
                language: ['eng'],
                subject: ['Fantasy', 'Epic Fantasy', 'Adventure', 'Magic'],
                cover_i: 7235833,
                cover_edition_key: 'OL24966367M',
                ratings_average: 4.65,
                ratings_count: 45678
            }
        ]
    },
    // Words of Radiance by Brandon Sanderson
    'title:Words of Radiance author:Brandon Sanderson': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL17090373W',
                title: 'Words of Radiance',
                author_name: ['Brandon Sanderson'],
                first_publish_year: 2014,
                isbn: ['9780765326362', '0765326361'],
                publisher: ['Tor Books'],
                number_of_pages_median: 1087,
                language: ['eng'],
                subject: ['Fantasy', 'Epic Fantasy', 'Adventure'],
                cover_i: 7658452,
                cover_edition_key: 'OL26478829M',
                ratings_average: 4.75,
                ratings_count: 38456
            }
        ]
    },
    // Oathbringer by Brandon Sanderson
    'title:Oathbringer author:Brandon Sanderson': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL19346256W',
                title: 'Oathbringer',
                author_name: ['Brandon Sanderson'],
                first_publish_year: 2017,
                isbn: ['9780765326379', '0765326377'],
                publisher: ['Tor Books'],
                number_of_pages_median: 1248,
                language: ['eng'],
                subject: ['Fantasy', 'Epic Fantasy', 'Adventure', 'Magic'],
                cover_i: 8734521,
                cover_edition_key: 'OL27342618M',
                ratings_average: 4.7,
                ratings_count: 32145
            }
        ]
    },
    // End of Watch by Stephen King (example from user request)
    'title:End of Watch author:Stephen King': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL17860744W',
                title: 'End of Watch',
                author_name: ['Stephen King'],
                first_publish_year: 2016,
                isbn: ['9781501129735', '1501129732'],
                publisher: ['Scribner'],
                number_of_pages_median: 432,
                language: ['eng'],
                subject: ['Thriller', 'Mystery', 'Horror', 'Crime'],
                cover_i: 8201594,
                cover_edition_key: 'OL26410387M',
                ratings_average: 4.1,
                ratings_count: 15234
            }
        ]
    },
    // Test Book (for test fixture)
    'title:Test Book author:Test Author': {
        numFound: 1,
        start: 0,
        numFoundExact: true,
        docs: [
            {
                key: '/works/OL12345W',
                title: 'Test Book',
                author_name: ['Test Author'],
                first_publish_year: 2020,
                isbn: ['9781234567890'],
                publisher: ['Test Publisher'],
                number_of_pages_median: 300,
                language: ['eng'],
                subject: ['Fiction'],
                cover_i: 1234567,
                cover_edition_key: 'OL1234567M',
                ratings_average: 4.5,
                ratings_count: 100
            }
        ]
    }
};
/**
 * Get OpenLibrary search response for a given title and author
 */
export function getOpenLibraryResponse(title, author) {
    const query = `title:${title} author:${author}`;
    return OPENLIBRARY_FIXTURES[query] || null;
}
/**
 * Generate OpenLibrary cover URL
 */
export function getOpenLibraryCoverUrl(coverId, size = 'M') {
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}
/**
 * Empty response for books not found
 */
export const EMPTY_RESPONSE = {
    numFound: 0,
    start: 0,
    numFoundExact: true,
    docs: []
};
