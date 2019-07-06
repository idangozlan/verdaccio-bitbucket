const NodeCache = require('node-cache');
const bcrypt = require('bcrypt');
const Auth = require('..');
const Bitbucket = require('../models/Bitbucket');
const getRedisClient = require('../redis');

jest.mock('../redis');
jest.mock('node-cache');
jest.mock('bcrypt');
jest.mock('../models/Bitbucket');

describe('Auth', () => {
  let logger;

  function createAuth(allow, cache, redis, hashPassword = false) {
    const config = {
      allow, cache, redis, hashPassword,
    };
    const stuff = { logger };
    return new Auth(config, stuff);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    NodeCache.mockClear();
    logger = { warn: () => {} };
  });

  describe('#ctor', () => {
    it('should parse an empty team', () => {
      expect.assertions(1);
      const auth = createAuth('foo');
      expect(auth.allow).toEqual({ foo: [] });
    });

    it('should parse a team with roles', () => {
      expect.assertions(1);
      const auth = createAuth('foo(bar|baz)');
      expect(auth.allow).toEqual({ foo: ['bar', 'baz'] });
    });
  });

  describe('#authenticate', () => {
    it('should deny entry when the bitbucket call fails', (done) => {
      expect.assertions(2);
      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve, reject) => {
        reject({ code: 'foo', message: 'bar' });
      }));
      const auth = createAuth('foo');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual({
          code: 'foo',
          message: 'bar',
        });
        expect(teams).toEqual(false);
        done();
      });
    });

    it('should deny entry when the user does not have a matching team', (done) => {
      expect.assertions(2);
      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      }));
      const auth = createAuth('bar');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual([]);
        done();
      });
    });

    it('should deny entry when the user has a matching team but not role', (done) => {
      expect.assertions(2);
      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      }));
      const auth = createAuth('foo(contributor)');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual([]);
        done();
      });
    });

    it('should allow entry when the user has a matching team', (done) => {
      expect.assertions(3);
      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      }));
      const auth = createAuth('foo');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(auth.allow).toEqual({ foo: [] });
        expect(teams).toEqual(['foo']);
        done();
      });
    });

    it('should allow entry when the user has a matching team and role', (done) => {
      expect.assertions(2);
      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      }));
      const auth = createAuth('foo(admin)');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
        done();
      });
    });

    it('get first from Bitbucket and then from in-memory (without hashing)', async () => {
      expect.assertions(9);

      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      }));
      const auth = createAuth('foo(admin)', 'in-memory');
      NodeCache.prototype.get.mockImplementationOnce(() => Promise.resolve(null));

      await auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
      });
      expect(NodeCache.mock.instances[0].get.mock.calls).toEqual([['u']]);

      /* second call */

      NodeCache.prototype.get.mockImplementationOnce(() => new Promise((resolve) => {
        resolve(JSON.stringify({ teams: ['foo'], password: 'p' }));
      }));

      await auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
      });

      expect(NodeCache.mock.instances[0].get.mock.calls).toEqual([['u'], ['u']]);

      expect(Bitbucket.mock.instances[0].getPrivileges.mock.calls.length).toEqual(1);
      expect(Bitbucket.mock.instances[0].constructor.mock.calls).toEqual([['u', 'p', { warn: expect.any(Function) }]]);
      expect(Bitbucket.mock.instances.length).toEqual(1);
    });

    it('get first from Bitbucket and then from in-memory (with hashing)', async () => {
      expect.assertions(9);

      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      }));
      const auth = createAuth('foo(admin)', 'in-memory', {}, true);
      bcrypt.compareSync.mockImplementationOnce(() => true);
      NodeCache.prototype.get.mockImplementationOnce(() => Promise.resolve(null));

      await auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
      });
      expect(NodeCache.mock.instances[0].get.mock.calls).toEqual([['u']]);

      /* second call */

      NodeCache.prototype.get.mockImplementationOnce(() => new Promise((resolve) => {
        resolve(JSON.stringify({ teams: ['foo'], password: 'p' }));
      }));

      await auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
      });

      expect(NodeCache.mock.instances[0].get.mock.calls).toEqual([['u'], ['u']]);

      expect(Bitbucket.mock.instances[0].getPrivileges.mock.calls.length).toEqual(1);
      expect(Bitbucket.mock.instances[0].constructor.mock.calls).toEqual([['u', 'p', { warn: expect.any(Function) }]]);
      expect(Bitbucket.mock.instances.length).toEqual(1);
    });

    it('fail due to missing redis configuration', async () => {
      expect.assertions(1);

      try {
        createAuth('foo(admin)', 'redis');
      } catch (error) {
        expect(error).toEqual(Error('Can\'t find Redis configuration'));
      }
    });

    it('get first from Bitbucket and then from redis', async () => {
      expect.assertions(9);

      bcrypt.compareSync.mockImplementationOnce(() => true);
      Bitbucket.prototype.getPrivileges.mockImplementation(() => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      }));
      const redisGet = jest.fn(() => false);
      const redisSet = jest.fn(() => false);
      getRedisClient.mockImplementation(() => ({
        get: redisGet,
        set: redisSet,
      }));
      const auth = createAuth('foo(admin)', 'redis', {
        host: 'localhost',
      });

      await auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
      });

      expect(redisGet.mock.calls).toEqual([['u']]);

      /* second call */

      redisGet.mockImplementationOnce(() => new Promise((resolve) => {
        resolve(JSON.stringify({ teams: ['foo'], password: 'p' }));
      }));

      await auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
      });

      expect(redisGet.mock.calls).toEqual([['u'], ['u']]);

      expect(Bitbucket.mock.instances[0].getPrivileges.mock.calls.length).toEqual(1);
      expect(Bitbucket.mock.instances[0].constructor.mock.calls).toEqual([['u', 'p', { warn: expect.any(Function) }]]);
      expect(Bitbucket.mock.instances.length).toEqual(1);
    });
  });
});
