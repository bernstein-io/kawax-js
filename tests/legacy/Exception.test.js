import Exception from '../src/Exception';

describe('Exception Class', () => {
  let error;
  const consoleError = global.console.error;
  let errorLog;
  beforeAll(() => {
    global.__DEV__ = true;
    errorLog = jest.fn();
    error = new Error('error');
    global.console.error = errorLog;
  });

  afterAll(() => {
    global.console.error = consoleError;
    global.__DEV__ = false;
  });

  test('Exception is created and returned correctly', () => {
    const exception = Exception(error);
    expect(exception).toBeDefined();
    expect(exception).toBe(error);
  });

  test('Exception is logged correcly if dev', () => {
    expect(errorLog).toHaveBeenCalled();
  });

  test('Exception is not logged if not dev', () => {
    global.__DEV__ = false;
    errorLog = jest.fn();
    global.console.error = errorLog;
    expect(errorLog).not.toHaveBeenCalled();
  });

});
