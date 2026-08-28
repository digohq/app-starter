import { Test, TestingModule } from '@nestjs/testing';
import { NotificationWebSocketGateway } from './notification.gateway';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

describe('NotificationWebSocketGateway', () => {
  let gateway: NotificationWebSocketGateway;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationWebSocketGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<NotificationWebSocketGateway>(NotificationWebSocketGateway);
    jwtService = module.get<JwtService>(JwtService);

    // Mock server
    gateway.server = { to: jest.fn().mockReturnThis(), emit: jest.fn() } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate user and add to sockets map', async () => {
      const mockClient = {
        handshake: { auth: { token: 'valid-token' }, headers: {} },
        data: {},
        id: 'socket-1',
        disconnect: jest.fn(),
      } as unknown as Socket;

      jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(mockClient);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockClient.data.userId).toBe('user-1');
      // @ts-expect-error - reaching into private property for testing
      expect(gateway.userSockets.get('user-1').has('socket-1')).toBe(true);
    });

    it('should disconnect if no token', async () => {
      const mockClient = {
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('sendNotificationToUser', () => {
    it('should emit event to user sockets', async () => {
      // Setup state
      // @ts-expect-error - reaching into private property for testing
      gateway.userSockets.set('user-1', new Set(['socket-1']));

      gateway.sendNotificationToUser('user-1', 'test_event', { foo: 'bar' });

      expect(gateway.server.to).toHaveBeenCalledWith(['socket-1']);
      expect(gateway.server.to(['socket-1']).emit).toHaveBeenCalledWith('test_event', {
        foo: 'bar',
      });
    });
  });
});
