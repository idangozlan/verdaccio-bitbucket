const moxios = require('moxios');

const Bitbucket = require('../models/Bitbucket');

describe('Bitbucket', () => {
  beforeEach(() => {
    moxios.install();
  });
  afterEach(() => {
    moxios.uninstall();
  });

  describe('#getTeams', () => {
    it('should return the teams', () => {
      expect.assertions(1);
      moxios.stubRequest(/^https:\/\/api.bitbucket.org\/2.0\/teams\?role=member&pagelen=\d+$/, {
        status: 200,
        response: {
          values: [
            { username: 'foo' },
            { username: 'bar' },
          ],
        },
      });
      return new Bitbucket('u', 'p', console).getTeams('member').then((response) => {
        expect(response).toEqual({
          role: 'member',
          teams: ['foo', 'bar'],
        });
      });
    });

    it('should follow next page links', () => {
      moxios.stubRequest(/^https:\/\/api.bitbucket.org\/2.0\/teams\?role=member&pagelen=\d+$/, {
        status: 200,
        response: {
          next: 'https://example.org/page2',
          values: [
            { username: 'foo' },
          ],
        },
      });
      moxios.stubRequest('https://example.org/page2', {
        status: 200,
        response: {
          values: [
            { username: 'bar' },
            { username: 'baz' },
          ],
        },
      });
      return new Bitbucket('u', 'p', console).getTeams('member').then((response) => {
        expect(response).toEqual({
          role: 'member',
          teams: ['foo', 'bar', 'baz'],
        });
      });
    });
  });

  describe('#getPrivileges', () => {
    it('should return privileges returned by getTeams', () => {
      const bb = new Bitbucket('u', 'p', console);
      bb.getTeams = role => new Promise((resolve) => {
        resolve({ role, teams: [`${role}Team`] });
      });
      return bb.getPrivileges().then((response) => {
        expect(response).toEqual({
          teams: {
            memberTeam: 'member',
            contributorTeam: 'contributor',
            adminTeam: 'admin',
          },
        });
      });
    });
  });
});
