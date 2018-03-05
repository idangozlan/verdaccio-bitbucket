const expect = require('chai').expect;

const cache = require('../lib/cache');
const Auth = require('../lib/index');

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
      const auth = createAuth('foo');
      expect(auth.allow).to.deep.equal({ foo: [] });
    });

    it('should parse a team with roles', () => {
      const auth = createAuth('foo(bar|baz)');
      expect(auth.allow).to.deep.equal({ foo: ['bar', 'baz'] });
    });
  });

  describe('#authenticate', () => {
    it('should deny entry when the bitbucket call fails', (done) => {
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve, reject) => {
        reject({ code: 'foo', message: 'bar' });
      });
      const auth = createAuth('foo');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).to.exist;
        expect(!!teams).to.be.false;
        done();
      });
    });

    it('should deny entry when the user does not have a matching team', (done) => {
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
      const auth = createAuth('bar');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).to.not.exist;
        expect(teams).to.be.empty;
        done();
      });
    });

    it('should deny entry when the user has a matching team but not role', (done) => {
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
      const auth = createAuth('foo(contributor)');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).to.not.exist;
        expect(teams).to.be.empty;
        done();
      });
    });

    it('should allow entry when the user has a matching team', (done) => {
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
      const auth = createAuth('foo');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).to.not.exist;
        expect(auth.allow).to.deep.equal({ foo: [] });
        expect(teams).to.deep.equal(['foo']);
        done();
      });
    });

    it('should allow entry when the user has a matching team and role', (done) => {
      Bitbucket2.prototype.getPrivileges = () => new Promise((resolve) => {
        resolve({ teams: { foo: 'admin' } });
      });
      const auth = createAuth('foo(admin)');

      auth.authenticate('u', 'p', (err, teams) => {
        expect(err).to.not.exist;
        expect(teams).to.deep.equal(['foo']);
        done();
      });
    });
  });
});
