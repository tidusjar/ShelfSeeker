import { getGlobalManager, resetGlobalManager } from '../mocks/server-manager.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown - runs once after all tests
 */
export default async function globalTeardown() {
  console.log('\n=== E2E Test Global Teardown ===\n');

  const manager = getGlobalManager();
  
  try {
    // Stop mock servers
    await manager.stopAll();
    console.log('✓ Mock servers stopped');

    // Clean up test config
    const serverConfigPath = path.join(process.cwd(), '..', 'server', 'config.test.json');
    if (fs.existsSync(serverConfigPath)) {
      fs.unlinkSync(serverConfigPath);
      console.log('✓ Test configuration cleaned up');
    }

    // Clean up any temp directories
    const tmpDir = path.join(process.cwd(), '.tmp');
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      console.log('✓ Temp directories cleaned up');
    }

    // Reset global manager
    resetGlobalManager();
    
    console.log('\n✓ Teardown complete\n');

  } catch (error) {
    console.error('✗ Error during teardown:', error);
    // Don't throw - allow tests to finish
  }
}
