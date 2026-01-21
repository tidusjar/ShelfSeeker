import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { NzbProvider, Downloader } from './types.js';
import { TIMEOUTS } from './constants.js';
import { logger } from './lib/logger.js';

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

export interface GeneralConfig {
  downloadPath: string;
}

export interface DownloaderConfig {
  usenet: Downloader[];
  torrent: Downloader[];
}

export interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  lastStep: number; // 0-3
  completedAt?: string; // ISO timestamp
}

export interface AppConfig {
  version: string;
  general: GeneralConfig;
  sources: {
    irc: IrcConfig;
    torrent: TorrentConfig;
    nzb: NzbConfig;
  };
  downloaders: DownloaderConfig;
  ui: UiConfig;
  onboarding: OnboardingState;
}

const DEFAULT_CONFIG: AppConfig = {
  version: '1.0',
  general: {
    downloadPath: process.env.DOWNLOAD_PATH || path.join(process.cwd(), 'downloads'),
  },
  sources: {
    irc: {
      enabled: false,
      server: '',
      port: 6667,
      channel: '',
      searchCommand: '',
      connectionTimeout: TIMEOUTS.IRC_CONNECTION,
      searchTimeout: TIMEOUTS.IRC_SEARCH,
      downloadTimeout: TIMEOUTS.IRC_DOWNLOAD,
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
  downloaders: {
    usenet: [],
    torrent: [],
  },
  ui: {
    theme: 'dark',
    maxResults: 100,
  },
  onboarding: {
    completed: false,
    skipped: false,
    lastStep: 0,
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
        logger.info('✓ Created default configuration at', { configPath: this.configPath });
        return;
      }

      // Try to load existing config
      try {
        this.db = await JSONFilePreset(this.configPath, DEFAULT_CONFIG);

        // Validate and migrate the loaded config structure
        const data = this.db.data;
        if (!data.version || !data.sources || !data.sources.irc) {
          throw new Error('Invalid config structure');
        }

        // Migrate old configs that don't have general section
        if (!data.general) {
          logger.info('  Migrating config: Adding general section');
          data.general = DEFAULT_CONFIG.general;
          await this.db.write();
        }

        // Migrate old configs that don't have downloaders section
        if (!data.downloaders) {
          logger.info('  Migrating config: Adding downloaders section');
          data.downloaders = DEFAULT_CONFIG.downloaders;
          await this.db.write();
        }

        // Migrate old configs that don't have onboarding section
        if (!data.onboarding) {
          logger.info('  Migrating config: Adding onboarding section');
          data.onboarding = DEFAULT_CONFIG.onboarding;
          await this.db.write();
        }
      } catch (parseError) {
        // Config file is corrupted
        logger.warn('⚠ Config file corrupted, backing up and resetting to defaults');

        // Backup corrupted file
        const backupPath = `${this.configPath}.backup`;
        fs.copyFileSync(this.configPath, backupPath);
        logger.info('  Backup saved to', { backupPath });

        // Delete corrupted file and create new one
        fs.unlinkSync(this.configPath);
        this.db = await JSONFilePreset(this.configPath, DEFAULT_CONFIG);
        logger.info('✓ Reset to default configuration');
      }
    } catch (error) {
      logger.error('Failed to initialize configuration:', error);
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
   * Get only the general configuration (user-editable fields)
   */
  getGeneralConfig(): GeneralConfig {
    return JSON.parse(JSON.stringify(this.db.data.general));
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
   * Validate general configuration values
   */
  validateGeneralConfig(config: Partial<GeneralConfig>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.downloadPath !== undefined) {
      if (typeof config.downloadPath !== 'string' || config.downloadPath.trim() === '') {
        errors.push({ field: 'downloadPath', message: 'Download path cannot be empty' });
      }
    }

    return errors;
  }

  /**
   * Update general configuration (supports partial updates)
   */
  async updateGeneralConfig(updates: Partial<GeneralConfig>): Promise<void> {
    // Validate updates
    const errors = this.validateGeneralConfig(updates);
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join(', '));
    }

    try {
      // Update the configuration
      Object.assign(this.db.data.general, updates);
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
      logger.info('✓ Configuration reset to defaults');
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

    logger.info('✓ Added NZB provider', { providerName: newProvider.name });
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

    logger.info('✓ Updated NZB provider', { providerName: this.db.data.sources.nzb.indexers[index].name });
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

    logger.info('✓ Deleted NZB provider', { providerName });
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

  // ============================================================================
  // DOWNLOADER MANAGEMENT
  // ============================================================================

  /**
   * Validate downloader configuration
   */
  private validateDownloader(downloader: Omit<Downloader, 'id'>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!downloader.name?.trim()) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!downloader.type) {
      errors.push({ field: 'type', message: 'Type is required' });
    }

    if (!downloader.host?.trim()) {
      errors.push({ field: 'host', message: 'Host is required' });
    }

    if (!downloader.port || downloader.port < 1 || downloader.port > 65535) {
      errors.push({ field: 'port', message: 'Port must be between 1 and 65535' });
    }

    if (!downloader.username?.trim()) {
      errors.push({ field: 'username', message: 'Username is required' });
    }

    if (!downloader.password?.trim()) {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    // SABnzbd requires API key
    if (downloader.type === 'sabnzbd' && !downloader.apiKey?.trim()) {
      errors.push({ field: 'apiKey', message: 'API key is required for SABnzbd' });
    }

    return errors;
  }

  /**
   * Get all usenet downloaders
   */
  getUsenetDownloaders(): Downloader[] {
    if (!this.db?.data?.downloaders?.usenet) {
      return [];
    }
    return JSON.parse(JSON.stringify(this.db.data.downloaders.usenet));
  }

  /**
   * Get enabled usenet downloader (only one allowed)
   */
  getEnabledUsenetDownloader(): Downloader | null {
    const downloaders = this.getUsenetDownloaders();
    const enabled = downloaders.find((d: Downloader) => d.enabled);
    return enabled || null;
  }

  /**
   * Add new usenet downloader
   */
  async addUsenetDownloader(downloader: Omit<Downloader, 'id'>): Promise<Downloader> {
    const errors = this.validateDownloader(downloader);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // If this downloader is being enabled, disable all others (only one allowed)
    if (downloader.enabled) {
      this.db.data.downloaders.usenet.forEach((d: Downloader) => {
        d.enabled = false;
      });
    }

    const newDownloader: Downloader = {
      ...downloader,
      id: crypto.randomUUID(),
    };

    this.db.data.downloaders.usenet.push(newDownloader);
    await this.db.write();

    logger.info('✓ Added usenet downloader', { name: newDownloader.name, type: newDownloader.type });
    return newDownloader;
  }

  /**
   * Update existing usenet downloader
   */
  async updateUsenetDownloader(id: string, updates: Partial<Downloader>): Promise<Downloader> {
    const index = this.db.data.downloaders.usenet.findIndex((d: Downloader) => d.id === id);
    if (index === -1) {
      throw new Error('Downloader not found');
    }

    const current = this.db.data.downloaders.usenet[index];
    const updated = { ...current, ...updates, id }; // Preserve ID

    const errors = this.validateDownloader(updated);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // If this downloader is being enabled, disable all others
    if (updates.enabled === true) {
      this.db.data.downloaders.usenet.forEach((d: Downloader, i: number) => {
        if (i !== index) {
          d.enabled = false;
        }
      });
    }

    this.db.data.downloaders.usenet[index] = updated;
    await this.db.write();

    logger.info('✓ Updated usenet downloader', { name: updated.name });
    return updated;
  }

  /**
   * Delete usenet downloader
   */
  async deleteUsenetDownloader(id: string): Promise<void> {
    const index = this.db.data.downloaders.usenet.findIndex((d: Downloader) => d.id === id);
    if (index === -1) {
      throw new Error('Downloader not found');
    }

    const name = this.db.data.downloaders.usenet[index].name;
    this.db.data.downloaders.usenet.splice(index, 1);
    await this.db.write();

    logger.info('✓ Deleted usenet downloader', { name });
  }

  // ============================================================================
  // ONBOARDING MANAGEMENT
  // ============================================================================

  /**
   * Get onboarding state
   */
  getOnboardingState(): OnboardingState {
    return JSON.parse(JSON.stringify(this.db.data.onboarding));
  }

  /**
   * Update onboarding state (supports partial updates)
   */
  async updateOnboardingState(updates: Partial<OnboardingState>): Promise<void> {
    try {
      Object.assign(this.db.data.onboarding, updates);
      await this.db.write();
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new Error('Failed to save onboarding state: Permission denied');
      }
      throw error;
    }
  }

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(): Promise<void> {
    try {
      this.db.data.onboarding.completed = true;
      this.db.data.onboarding.completedAt = new Date().toISOString();
      await this.db.write();
      logger.info('✓ Onboarding completed');
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new Error('Failed to save onboarding state: Permission denied');
      }
      throw error;
    }
  }

  /**
   * Mark onboarding as skipped
   */
  async skipOnboarding(): Promise<void> {
    try {
      this.db.data.onboarding.completed = true;
      this.db.data.onboarding.skipped = true;
      await this.db.write();
      logger.info('✓ Onboarding skipped');
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new Error('Failed to save onboarding state: Permission denied');
      }
      throw error;
    }
  }

  /**
   * Reset onboarding state (for testing)
   */
  async resetOnboarding(): Promise<void> {
    try {
      this.db.data.onboarding = JSON.parse(JSON.stringify(DEFAULT_CONFIG.onboarding));
      await this.db.write();
      logger.info('✓ Onboarding reset to defaults');
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new Error('Failed to reset onboarding state: Permission denied');
      }
      throw error;
    }
  }
}
