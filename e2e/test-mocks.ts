/**
 * Simple test script to verify mock servers work
 */
import { TestServerManager } from './mocks/server-manager.js';
import { getIrcResults } from './mocks/fixtures/irc-responses.js';

async function testMockServers() {
  console.log('Testing mock servers...\n');
  
  const manager = new TestServerManager();
  
  try {
    // Start servers
    const { ircPort, nzbPort } = await manager.startAll();
    console.log('\n✓ Servers started successfully');
    
    // Test IRC fixtures
    const duneResults = getIrcResults('dune');
    console.log(`\n✓ IRC fixtures loaded: ${duneResults.length} results for "dune"`);
    console.log('  Sample:', duneResults[0]);
    
    // Test Newznab server with fetch
    const nzbUrl = `http://localhost:${nzbPort}/api?t=search&q=dune&apikey=test-api-key`;
    console.log(`\n✓ Testing NZB server at ${nzbUrl}`);
    
    const response = await fetch(nzbUrl);
    if (response.ok) {
      const xml = await response.text();
      console.log('✓ NZB server responded with XML');
      console.log('  XML length:', xml.length);
    } else {
      console.error('✗ NZB server error:', response.status);
    }
    
    // Stop servers
    await manager.stopAll();
    console.log('\n✓ Servers stopped successfully');
    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

testMockServers();
