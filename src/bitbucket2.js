import axios from 'axios';

class Bitbucket2 {
  constructor(username, password) {
    this.apiVersion = '1.0';
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

  getPrivileges() {
    const { username, password, apiUrl } = this;
    return axios({
      method: 'get',
      url: `${apiUrl}/user/privileges/`,
      auth: {
        username,
        password,
      },
    }).then(response => response.data);
  }
}

module.exports = Bitbucket2;
