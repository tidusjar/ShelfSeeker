import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { IrcClient } from './client.js';
import { DccHandler } from './dccHandler.js';

// Mock IRC client instance that will be reused
let mockIrcInstance: any;

// Mock irc-framework
vi.mock('irc-framework', () => {
  // Everything must be defined inline in the factory
  const events = require('events');

  return {
    default: {
      Client: class extends events.EventEmitter {
        connect = vi.fn();
        join = vi.fn();
        say = vi.fn();
        quit = vi.fn();
        user = { nick: 'testuser' };

        constructor(config?: any) {
          super();
          // Store reference to this instance
          (global as any).__mockIrcInstance = this;
        }
      }
    }
  };
});

describe('IrcClient - Ban Detection', () => {
  let ircClient: IrcClient;
  let mockDccHandler: DccHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockDccHandler = {
      findTextFile: vi.fn(),
      extractZip: vi.fn()
    } as any;

    // Create a fresh IRC client for each test
    ircClient = new IrcClient(
      {
        server: 'test.server.com',
        port: 6667,
        channel: '#test',
        nick: 'testuser'
      },
      mockDccHandler
    );

    // Get the mock instance from global
    mockIrcInstance = (global as any).__mockIrcInstance;
  });

  afterEach(() => {
    // Clean up all event listeners to prevent cross-test pollution
    ircClient.removeAllListeners();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('G-line/Z-line ban detection', () => {
    it('should detect G-line ban after 2 consecutive connection drops without server response', async () => {
      const bannedSpy = vi.fn();
      const errorSpy = vi.fn();
      ircClient.on('banned', bannedSpy);
      ircClient.on('error', errorSpy);

      // First connection attempt - socket closes without server response
      const connectPromise = ircClient.connect().catch(() => {
        // Expected to fail due to ban detection
      });

      // Simulate socket close during connecting without any server message
      mockIrcInstance.emit('socket close');

      // Second connection attempt - socket closes again
      await vi.advanceTimersByTimeAsync(5000); // Wait for retry delay
      mockIrcInstance.emit('socket close');

      // Wait for promises to settle
      await vi.advanceTimersByTimeAsync(100);

      // Should detect G-line ban after 2 consecutive drops
      expect(bannedSpy).toHaveBeenCalledWith({
        type: 'gline',
        message: 'Server dropping connection without response',
        currentNick: 'testuser'
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('G-line/Z-line ban')
        })
      );

      expect(ircClient.isBannedFromServer()).toBe(true);
    });

    it('should not trigger G-line ban if server sends response', async () => {
      const bannedSpy = vi.fn();
      ircClient.on('banned', bannedSpy);

      // Start connection
      const connectPromise = ircClient.connect();

      // Simulate server response (from_server: true)
      mockIrcInstance.emit('raw', {
        line: ':server.com NOTICE AUTH :*** Looking up your hostname',
        from_server: true
      });

      // Then socket closes
      mockIrcInstance.emit('socket close');

      // Should NOT be detected as G-line ban because server responded
      expect(bannedSpy).not.toHaveBeenCalled();
      expect(ircClient.isBannedFromServer()).toBe(false);
    });

    it('should reset consecutive drop counter after successful connection', async () => {
      // Listen for error events to prevent unhandled errors
      ircClient.on('error', () => {});

      // First drop
      const connectPromise1 = ircClient.connect().catch(() => {});
      mockIrcInstance.emit('socket close');

      // Successful connection
      await vi.advanceTimersByTimeAsync(5000);
      mockIrcInstance.emit('registered');
      mockIrcInstance.emit('join', { nick: 'testuser' });

      // Wait for connection to settle
      await vi.advanceTimersByTimeAsync(100);

      // Disconnect
      ircClient.disconnect();
      mockIrcInstance.emit('close');

      // Try connecting again - should start fresh counter
      const connectPromise2 = ircClient.connect().catch(() => {});
      mockIrcInstance.emit('socket close');
      await vi.advanceTimersByTimeAsync(5000);
      mockIrcInstance.emit('socket close');

      // Wait for promises to settle
      await vi.advanceTimersByTimeAsync(100);

      // Should still detect ban (counter was reset after successful connection)
      expect(ircClient.isBannedFromServer()).toBe(true);
    });
  });

  describe('IRC error code ban detection', () => {
    it('should detect 465 (ERR_YOUREBANNEDCREEP) server ban', async () => {
      const bannedSpy = vi.fn();
      const errorSpy = vi.fn();
      ircClient.on('banned', bannedSpy);
      ircClient.on('error', errorSpy);

      // Simulate 465 error from server
      mockIrcInstance.emit('465', {
        params: ['testuser', 'You are banned from this server']
      });

      expect(bannedSpy).toHaveBeenCalledWith({
        type: 'server',
        message: 'You are banned from this server',
        currentNick: 'testuser'
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('IRC Server Ban'),
          code: 'IRC_SERVER_BAN'
        })
      );

      expect(ircClient.isBannedFromServer()).toBe(true);
    });

    it('should detect 474 (ERR_BANNEDFROMCHAN) channel ban', async () => {
      const bannedSpy = vi.fn();
      const errorSpy = vi.fn();
      ircClient.on('banned', bannedSpy);
      ircClient.on('error', errorSpy);

      // Simulate 474 error from server
      mockIrcInstance.emit('474', {
        params: ['testuser', '#test', 'Cannot join channel (+b)']
      });

      expect(bannedSpy).toHaveBeenCalledWith({
        type: 'channel',
        channel: '#test',
        message: 'Cannot join channel (+b)',
        currentNick: 'testuser'
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('IRC Channel Ban'),
          code: 'IRC_CHANNEL_BAN'
        })
      );

      expect(ircClient.isBannedFromServer()).toBe(true);
    });

    it('should detect 477 (ERR_NOCHANMODES) registration required', async () => {
      const errorSpy = vi.fn();
      ircClient.on('error', errorSpy);

      // Simulate 477 error from server
      mockIrcInstance.emit('477', {
        params: ['testuser', '#test', 'Channel requires registration']
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('requires registration'),
          code: 'IRC_REGISTRATION_REQUIRED'
        })
      );

      // 477 doesn't set ban status
      expect(ircClient.isBannedFromServer()).toBe(false);
    });
  });

  describe('Ban prevention logic', () => {
    it('should prevent connection when banned', async () => {
      // Listen for error event to prevent unhandled error
      ircClient.on('error', () => {
        // Expected error from ban detection
      });

      // Set up ban
      mockIrcInstance.emit('465', {
        params: ['testuser', 'You are banned']
      });

      expect(ircClient.isBannedFromServer()).toBe(true);

      // Try to connect while banned
      await expect(ircClient.connect()).rejects.toThrow(
        'Cannot connect: banned from server/channel'
      );
    });

    it('should prevent auto-reconnect when banned', async () => {
      // Listen for error events to prevent unhandled errors
      ircClient.on('error', () => {});

      const reconnectingSpy = vi.fn();
      ircClient.on('reconnecting', reconnectingSpy);

      // Trigger G-line ban
      const connectPromise = ircClient.connect().catch(() => {});
      mockIrcInstance.emit('socket close');
      await vi.advanceTimersByTimeAsync(5000);
      mockIrcInstance.emit('socket close');

      // Wait for ban detection
      await vi.advanceTimersByTimeAsync(100);

      // Should be banned now
      expect(ircClient.isBannedFromServer()).toBe(true);

      // Reconnecting was called once (after first drop, before ban)
      expect(reconnectingSpy).toHaveBeenCalledTimes(1);

      // Clear the spy to track future calls
      reconnectingSpy.mockClear();

      // Trigger another socket close - should NOT attempt reconnect anymore
      mockIrcInstance.emit('socket close');
      await vi.advanceTimersByTimeAsync(10000);

      // Should not have emitted any more reconnecting events
      expect(reconnectingSpy).not.toHaveBeenCalled();
    });
  });

  describe('Ban status management', () => {
    it('should reset ban status when resetBanStatus is called', () => {
      // Listen for error event to prevent unhandled error
      ircClient.on('error', () => {});

      // Set ban
      mockIrcInstance.emit('465', {
        params: ['testuser', 'Banned']
      });

      expect(ircClient.isBannedFromServer()).toBe(true);

      // Reset ban status
      ircClient.resetBanStatus();

      expect(ircClient.isBannedFromServer()).toBe(false);
    });

    it('should reset ban status and generate new nickname on reconnectWithNewNickname', async () => {
      // Listen for error event to prevent unhandled error
      ircClient.on('error', () => {});

      // Set ban
      mockIrcInstance.emit('465', {
        params: ['testuser', 'Banned']
      });

      expect(ircClient.isBannedFromServer()).toBe(true);
      const oldNick = ircClient.getNickname();

      // Reconnect with new nickname
      const reconnectPromise = ircClient.reconnectWithNewNickname();

      // Fast-forward disconnect delay
      await vi.advanceTimersByTimeAsync(1000);

      // Get the new nickname that was generated
      const newNick = ircClient.getNickname();

      // Update mock user.nick to match
      mockIrcInstance.user.nick = newNick;

      // Simulate successful connection with the new nickname
      mockIrcInstance.emit('registered');
      mockIrcInstance.emit('join', { nick: newNick });

      // Wait for connection to settle
      await vi.advanceTimersByTimeAsync(100);

      await reconnectPromise;

      // Verify nickname changed
      expect(newNick).not.toBe(oldNick);
      expect(newNick).toMatch(/^shelfseeker_\d{4}$/);

      // Should not be banned anymore
      expect(ircClient.isBannedFromServer()).toBe(false);
    });
  });

  describe('Connection status', () => {
    it('should set status to error when banned', () => {
      // Listen for error event to prevent unhandled error
      ircClient.on('error', () => {});

      expect(ircClient.getStatus()).toBe('disconnected');

      mockIrcInstance.emit('465', {
        params: ['testuser', 'Banned']
      });

      expect(ircClient.getStatus()).toBe('error');
    });

    it('should emit connection lifecycle events correctly', async () => {
      const connectedSpy = vi.fn();
      const joinedSpy = vi.fn();
      const disconnectedSpy = vi.fn();

      ircClient.on('connected', connectedSpy);
      ircClient.on('joined', joinedSpy);
      ircClient.on('disconnected', disconnectedSpy);

      // Successful connection flow
      const connectPromise = ircClient.connect();
      mockIrcInstance.emit('registered');
      expect(connectedSpy).toHaveBeenCalled();

      mockIrcInstance.emit('join', { nick: 'testuser' });
      expect(joinedSpy).toHaveBeenCalledWith('#test');

      ircClient.disconnect();
      mockIrcInstance.emit('close');
      expect(disconnectedSpy).toHaveBeenCalled();
    });
  });
});
