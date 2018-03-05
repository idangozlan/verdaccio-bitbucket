import axios from 'axios';

class Bitbucket2 {
  constructor(username, password) {
    this.apiVersion = '2.0';
    this.apiUrl = `https://api.bitbucket.org/${this.apiVersion}`;
    this.username = username;
    this.password = password;
  }

  getUser() {
    // currently not in use, maybe in the future it will be.
    const { username, password, apiUrl } = this;
    return axios({
      method: 'get',
      url: `${apiUrl}/user`,
      auth: {
        username,
        password,
      },
    }).then(response => response.data);
  }

  getTeams(role) {
    const { username, password, apiUrl } = this;
    const teams = [];

    function callApi(url) {
      return axios({
        method: 'get',
        url,
        auth: { username, password },
      }).then((response) => {
        teams.push(...response.data.values.map(x => x.username));
        if (response.data.next) return callApi(response.data.next);
        return { role, teams };
      });
    }

    return callApi(`${apiUrl}/teams?role=${role}&pagelen=100`);
  }

  getPrivileges() {
    return Promise.all([
      this.getTeams('member'),
      this.getTeams('contributor'),
      this.getTeams('admin'),
    ]).then((values) => {
      const result = {};
      values.forEach(({ role, teams }) => {
        Object.assign(result, ...teams.map(t => ({ [t]: role })));
      });
      return { teams: result };
    });
  }
}

module.exports = Bitbucket2;
