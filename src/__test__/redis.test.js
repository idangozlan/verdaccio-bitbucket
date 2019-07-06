const redis = require('redis');
const redisMock = require('redis-mock');
const getRedisClient = require('../redis');

jest.spyOn(redis, 'createClient').mockImplementation(redisMock.createClient);

describe('Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    redis.quit();
  });

  it('wrap redis', async () => {
    expect.assertions(3);

    const client = getRedisClient({
      host: 'localhost',
    });


    let cacheRes = await client.get('testKey');
    expect(cacheRes).toEqual(null);
    await client.set('testKey', 'some-data');
    cacheRes = await client.get('testKey');
    expect(cacheRes).toEqual('some-data');

    expect(redis.createClient.mock.calls).toEqual([[{ host: 'localhost' }]]);
  });
});
