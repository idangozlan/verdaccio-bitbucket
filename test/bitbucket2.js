const expect = require('chai').expect;
const moxios = require('moxios');

const Bitbucket2 = require('../lib/bitbucket2');

describe('Bitbucket2', () => {
  beforeEach(() => {
    moxios.install();
  });
  afterEach(() => {
    moxios.uninstall();
  });

  describe('#getPrivileges', () => {
    it('should return privileges extracted from the teams key', (done) => {
      moxios.stubRequest('https://api.bitbucket.org/1.0/user/privileges/', {
        status: 200,
        response: {
          teams: {
            foo: 'admin',
            bar: 'collaborator',
          },
        },
      });
      new Bitbucket2('u', 'p').getPrivileges().then((response) => {
        expect(response.teams.foo).to.equal('admin');
        expect(response.teams.bar).to.equal('collaborator');
        done();
      });
    });
  });
});
