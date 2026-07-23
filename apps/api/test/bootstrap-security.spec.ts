import { configureApplication } from '../src/bootstrap';

describe('configureApplication security controls', () => {
  function createApplication() {
    const config = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'API_CORS_ORIGINS') return 'https://app.example.test';
        if (key === 'API_SWAGGER_ENABLED') return false;
        throw new Error(`Unexpected configuration key: ${key}`);
      }),
    };
    const app = {
      get: jest.fn().mockReturnValue(config),
      use: jest.fn(),
      enableCors: jest.fn(),
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      useGlobalFilters: jest.fn(),
    };

    configureApplication(app as never);
    return app;
  }

  it('installs Helmet and permits credentialed CORS only for configured origins', () => {
    const app = createApplication();
    const cors = app.enableCors.mock.calls[0][0] as {
      credentials: boolean;
      origin: (
        origin: string | undefined,
        callback: (error: Error | null, allow?: boolean) => void,
      ) => void;
    };
    const allowed = jest.fn();
    const blocked = jest.fn();

    expect(app.use).toHaveBeenCalledTimes(1);
    expect(cors.credentials).toBe(true);

    cors.origin('https://app.example.test', allowed);
    cors.origin('https://attacker.example.test', blocked);

    expect(allowed).toHaveBeenCalledWith(null, true);
    expect(blocked).toHaveBeenCalledWith(expect.any(Error));
    expect(blocked.mock.calls[0][0].message).toBe('Origin is not allowed by CORS.');
  });
});
