const cache = require('../cache');
const Auth = require('..');

describe('Auth', () => {
  let logger;
  let Bitbucket2;

  function createAuth(allow) {
    const config = { allow };
    const stuff = { logger };
    const auth = new Auth(config, stuff);
    auth.Bitbucket2 = Bitbucket2;
    return auth;
  }

  beforeEach(() => {
    cache.clear();
    logger = { warn: () => {} };
    Bitbucket2 = function Bitbucket2Mock(username, password) {
      this.username = username;
      this.password = password;
    };
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
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve, reject) => {
        reject({ code: 'foo', message: 'bar' });
      });
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
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
      const auth = createAuth('bar');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual([]);
        done();
      });
    });

    it('should deny entry when the user has a matching team but not role', (done) => {
      expect.assertions(2);
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
      const auth = createAuth('foo(contributor)');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual([]);
        done();
      });
    });

    it('should allow entry when the user has a matching team', (done) => {
      expect.assertions(3);
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
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
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
      const auth = createAuth('foo(admin)');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).toEqual(null);
        expect(teams).toEqual(['foo']);
        done();
      });
    });
  });
});
