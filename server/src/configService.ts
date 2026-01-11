import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { NzbProvider } from './types.js';

export interface IrcConfig {
  enabled: boolean;
  server: string;
  port: number;
  channel: string;
  searchCommand: string;
  connectionTimeout: number;
  searchTimeout: number;
  downloadTimeout: number;
}

export interface TorrentConfig {
  enabled: boolean;
  indexers: any[];
}

export interface NzbConfig {
  enabled: boolean;
  indexers: NzbProvider[];
}

export interface UiConfig {
  theme: string;
  maxResults: number;
}

export interface AppConfig {
  version: string;
  sources: {
    irc: IrcConfig;
    torrent: TorrentConfig;
    nzb: NzbConfig;
  };
  ui: UiConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  version: '1.0',
  sources: {
    irc: {
      enabled: true,
      server: 'irc.irchighway.net',
      port: 6667,
      channel: '#ebooks',
      searchCommand: '@search',
      connectionTimeout: 30000,
      searchTimeout: 30000,
      downloadTimeout: 300000,
    },
    torrent: {
      enabled: false,
      indexers: [],
    },
    nzb: {
      enabled: false,
      indexers: [],
    },
  },
  ui: {
    theme: 'dark',
    maxResults: 100,
  },
};

export interface ValidationError {
  field: string;
  message: string;
}

export class ConfigService {
  private db: any;
  private configPath: string;

  constructor(configPath?: string) {
    // Allow config path override via environment variable
    this.configPath = configPath || process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');
  }

  async initialize(): Promise<void> {
    try {
      // Check if config file exists
      const exists = fs.existsSync(this.configPath);

      if (!exists) {
        // Create with defaults
        this.db = await JSONFilePreset(this.configPath, DEFAULT_CONFIG);
        console.log('✓ Created default configuration at', this.configPath);
        return;
      }

      // Try to load existing config
      try {
        this.db = await JSONFilePreset(this.configPath, DEFAULT_CONFIG);

        // Validate the loaded config structure
        const data = this.db.data;
        if (!data.version || !data.sources || !data.sources.irc) {
          throw new Error('Invalid config structure');
        }
      } catch (parseError) {
        // Config file is corrupted
        console.warn('⚠ Config file corrupted, backing up and resetting to defaults');

        // Backup corrupted file
        const backupPath = `${this.configPath}.backup`;
        fs.copyFileSync(this.configPath, backupPath);
        console.log(`  Backup saved to ${backupPath}`);

        // Delete corrupted file and create new one
        fs.unlinkSync(this.configPath);
        this.db = await JSONFilePreset(this.configPath, DEFAULT_CONFIG);
        console.log('✓ Reset to default configuration');
      }
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      throw error;
    }
  }

  /**
   * Get the current configuration (returns a defensive copy)
   */
  get(): AppConfig {
    return JSON.parse(JSON.stringify(this.db.data));
  }

  /**
   * Get only the IRC configuration (user-editable fields)
   */
  getIrcConfig(): IrcConfig {
    return JSON.parse(JSON.stringify(this.db.data.sources.irc));
  }

  /**
   * Validate IRC configuration values
   */
  validateIrcConfig(config: Partial<IrcConfig>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.server !== undefined) {
      if (typeof config.server !== 'string' || config.server.trim() === '') {
        errors.push({ field: 'server', message: 'Server address cannot be empty' });
      }
    }

    if (config.port !== undefined) {
      if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
        errors.push({ field: 'port', message: 'Port must be between 1 and 65535' });
      }
    }

    if (config.channel !== undefined) {
      if (typeof config.channel !== 'string' || config.channel.trim() === '') {
        errors.push({ field: 'channel', message: 'Channel cannot be empty' });
      } else if (!config.channel.startsWith('#')) {
        errors.push({ field: 'channel', message: 'Channel must start with #' });
      }
    }

    if (config.searchCommand !== undefined) {
      if (typeof config.searchCommand !== 'string' || config.searchCommand.trim() === '') {
        errors.push({ field: 'searchCommand', message: 'Search command cannot be empty' });
      }
    }

    return errors;
  }

  /**
   * Update IRC configuration (supports partial updates)
   */
  async updateIrcConfig(updates: Partial<IrcConfig>): Promise<void> {
    // Validate updates
    const errors = this.validateIrcConfig(updates);
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join(', '));
    }

    try {
      // Update the configuration
      Object.assign(this.db.data.sources.irc, updates);
      await this.db.write();
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new Error('Failed to save configuration: Permission denied');
      }
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    try {
      this.db.data = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      await this.db.write();
      console.log('✓ Configuration reset to defaults');
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new Error('Failed to reset configuration: Permission denied');
      }
      throw error;
    }
  }

  /**
   * Get the path to the config file
   */
  getConfigPath(): string {
    return this.configPath;
  }

  // ============================================================================
  // NZB Provider Management
  // ============================================================================

  /**
   * Validate NZB provider configuration
   */
  validateNzbProvider(provider: Partial<NzbProvider>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (provider.name !== undefined) {
      if (typeof provider.name !== 'string' || provider.name.trim() === '') {
        errors.push({ field: 'name', message: 'Provider name cannot be empty' });
      }
    }

    if (provider.url !== undefined) {
      if (typeof provider.url !== 'string' || provider.url.trim() === '') {
        errors.push({ field: 'url', message: 'URL cannot be empty' });
      } else {
        try {
          new URL(provider.url);
        } catch {
          errors.push({ field: 'url', message: 'Invalid URL format' });
        }
      }
    }

    if (provider.apiKey !== undefined) {
      if (typeof provider.apiKey !== 'string' || provider.apiKey.trim() === '') {
        errors.push({ field: 'apiKey', message: 'API key cannot be empty' });
      }
    }

    if (provider.categories !== undefined) {
      if (!Array.isArray(provider.categories) || provider.categories.length === 0) {
        errors.push({ field: 'categories', message: 'At least one category required' });
      }
    }

    return errors;
  }

  /**
   * Get all NZB providers (returns defensive copy)
   */
  getNzbProviders(): NzbProvider[] {
    return JSON.parse(JSON.stringify(this.db.data.sources.nzb.indexers));
  }

  /**
   * Add a new NZB provider
   */
  async addNzbProvider(provider: Omit<NzbProvider, 'id'>): Promise<NzbProvider> {
    const errors = this.validateNzbProvider(provider);
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join(', '));
    }

    const newProvider: NzbProvider = {
      id: crypto.randomUUID(),
      requestsToday: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      ...provider
    };

    this.db.data.sources.nzb.indexers.push(newProvider);
    await this.db.write();

    console.log(`✓ Added NZB provider: ${newProvider.name}`);
    return newProvider;
  }

  /**
   * Update an existing NZB provider
   */
  async updateNzbProvider(id: string, updates: Partial<NzbProvider>): Promise<void> {
    const index = this.db.data.sources.nzb.indexers.findIndex((p: NzbProvider) => p.id === id);
    if (index === -1) {
      throw new Error('Provider not found');
    }

    const errors = this.validateNzbProvider(updates);
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join(', '));
    }

    Object.assign(this.db.data.sources.nzb.indexers[index], updates);
    await this.db.write();

    console.log(`✓ Updated NZB provider: ${this.db.data.sources.nzb.indexers[index].name}`);
  }

  /**
   * Delete an NZB provider
   */
  async deleteNzbProvider(id: string): Promise<void> {
    const index = this.db.data.sources.nzb.indexers.findIndex((p: NzbProvider) => p.id === id);
    if (index === -1) {
      throw new Error('Provider not found');
    }

    const providerName = this.db.data.sources.nzb.indexers[index].name;
    this.db.data.sources.nzb.indexers.splice(index, 1);
    await this.db.write();

    console.log(`✓ Deleted NZB provider: ${providerName}`);
  }

  /**
   * Increment NZB usage counter for a provider (with daily reset)
   */
  async incrementNzbUsage(id: string): Promise<void> {
    const provider = this.db.data.sources.nzb.indexers.find((p: NzbProvider) => p.id === id);
    if (!provider) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Reset counter if it's a new day
    if (provider.lastResetDate !== today) {
      provider.requestsToday = 0;
      provider.lastResetDate = today;
    }

    provider.requestsToday = (provider.requestsToday || 0) + 1;
    await this.db.write();
  }
}
