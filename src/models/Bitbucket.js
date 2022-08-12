const axios = require('axios');

const API_URL = 'https://api.bitbucket.org';
const API_VERSION = '2.0';

function Bitbucket(username, password, logger) {
  this.apiUrl = `${API_URL}/${API_VERSION}`;
  this.username = username;
  this.password = password;
  this.logger = logger;
}

Bitbucket.prototype.getUser = function getUser() {
  // currently not in use, maybe in the future it will be.
  const { username, password, apiUrl } = this;
  return axios({
    method: 'get',
    url: `${apiUrl}/user`,
    auth: { username, password },
  }).then((response) => response.data);
};

Bitbucket.prototype.getTeams = function getTeams(role) {
  const { username, password, apiUrl } = this;
  const teams = [];
  const endpoint = `${apiUrl}/workspaces?role=${role}&pagelen=100`;
  this.logger.debug(`[bitbucket] getting teams for ${username}, url: ${endpoint}, role: ${role}`);

  function callApi(url) {
    return axios({
      method: 'get',
      url,
      auth: { username, password },
    }).then((response) => {
      teams.push(...response.data.values.map((x) => x.slug));
      if (response.data.next) return callApi(response.data.next);
      return { role, teams };
    });
  }

  return callApi(`${endpoint}`);
};

Bitbucket.prototype.getPrivileges = function getPrivileges() {
  return Promise.all([
    this.getTeams('member'),
    this.getTeams('collaborator'),
    this.getTeams('owner'),
  ]).then((values) => {
    const result = {};
    values.forEach(({ role, teams }) => {
      Object.assign(result, ...teams.map((t) => ({ [t]: role })));
    });
    return { teams: result };
  });
};

module.exports = Bitbucket;
