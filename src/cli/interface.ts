import prompts from 'prompts';
import { SearchResult } from '../types.js';

/**
 * CLI Interface Manager
 * Handles user interaction through prompts
 */
export class CliInterface {
  /**
   * Show welcome message
   */
  showWelcome(): void {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   IRC Ebook Search & Download Tool    ║');
    console.log('╚════════════════════════════════════════╝');
    console.log();
  }

  /**
   * Show connecting status
   */
  showConnecting(server: string, channel: string): void {
    console.log(`Connecting to ${server}...`);
    console.log(`Joining ${channel}...`);
  }

  /**
   * Show connected status
   */
  showConnected(channel: string, nickname: string): void {
    console.log(`✓ Connected to ${channel} as ${nickname}`);
    console.log();
  }

  /**
   * Show connection error
   */
  showConnectionError(error: string): void {
    console.error(`✗ Connection failed: ${error}`);
  }

  /**
   * Prompt for search term
   */
  async promptSearchTerm(): Promise<string | null> {
    const response = await prompts({
      type: 'text',
      name: 'query',
      message: 'Enter search term (or "exit" to quit):',
      validate: (value: string) => {
        if (!value.trim()) return 'Please enter a search term';
        return true;
      }
    });

    if (response.query === 'exit') {
      return null;
    }

    return response.query;
  }

  /**
   * Show searching status
   */
  showSearching(query: string): void {
    console.log(`\nSearching for "${query}"...`);
    console.log('Waiting for results...');
  }

  /**
   * Show waiting for results
   */
  showWaiting(seconds: number): void {
    console.log(`Waiting ${seconds} seconds for results...`);
  }

  /**
   * Ask if user wants to wait longer
   */
  async askWaitLonger(): Promise<boolean> {
    const response = await prompts({
      type: 'confirm',
      name: 'wait',
      message: 'No results yet. Wait longer?',
      initial: true
    });

    return response.wait ?? false;
  }

  /**
   * Show search results
   */
  showResults(results: SearchResult[]): void {
    if (results.length === 0) {
      console.log('\nNo results found.');
      return;
    }

    console.log(`\n✓ Found ${results.length} results:\n`);

    results.forEach((result, index) => {
      console.log(
        `${index + 1}. [${result.botCommand}] ${result.filename} (${result.filesize})`
      );
    });
    console.log();
  }

  /**
   * Prompt user to select a result
   */
  async promptSelection(maxIndex: number): Promise<number | null> {
    const response = await prompts({
      type: 'number',
      name: 'selection',
      message: `Select book (1-${maxIndex}, or 0 to search again):`,
      validate: (value: number) => {
        if (value < 0 || value > maxIndex) {
          return `Please enter a number between 0 and ${maxIndex}`;
        }
        return true;
      }
    });

    if (response.selection === undefined) {
      return null;
    }

    return response.selection;
  }

  /**
   * Show downloading status
   */
  showDownloading(filename: string): void {
    console.log(`\nDownloading "${filename}"...`);
  }

  /**
   * Show download progress
   */
  showDownloadProgress(percentage: number, speed: number): void {
    const speedMB = (speed / (1024 * 1024)).toFixed(2);
    console.log(`Progress: ${percentage}% (${speedMB} MB/s)`);
  }

  /**
   * Show download complete
   */
  showDownloadComplete(filename: string, filepath: string): void {
    console.log(`✓ Download complete: ${filepath}\n`);
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    console.error(`✗ Error: ${message}\n`);
  }

  /**
   * Show timeout message
   */
  showTimeout(): void {
    console.log('\n⏱ Request timed out. Returning to search...\n');
  }

  /**
   * Show reconnecting message
   */
  showReconnecting(attempt: number): void {
    console.log(`\n⚠ Connection lost. Reconnecting (attempt ${attempt})...`);
  }

  /**
   * Show goodbye message
   */
  showGoodbye(): void {
    console.log('\nDisconnecting...');
    console.log('Goodbye!\n');
  }

  /**
   * Show DCC incoming notification
   */
  showDccIncoming(filename: string): void {
    console.log(`Receiving file: ${filename}...`);
  }

  /**
   * Show parsing results message
   */
  showParsingResults(): void {
    console.log('Parsing search results...');
  }
}
