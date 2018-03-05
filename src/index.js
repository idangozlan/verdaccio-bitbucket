import Bitbucket2 from './bitbucket2';
import cache from './cache';

/**
 * Parses config allow option and returns result
 *
 * @param {string} allow - string to parse
 * @returns {Object}
 * @access private
 */
function parseAllow(allow) {
  const result = {};

  allow.split(/\s*,\s*/).forEach((team) => {
    const newTeam = team.trim().match(/^(.*?)(\((.*?)\))?$/);

    result[newTeam[1]] = newTeam[3] ? newTeam[3].split('|') : [];
  });

  return result;
}

/**
 * Decodes a username to an email address.
 *
 * Since the local portion of email addresses
 * can't end with a dot or contain two consecutive
 * dots, we can replace the `@` with `..`. This
 * function converts from the above encoding to
 * a proper email address.
 *
 * @param {string} username
 * @returns {string}
 * @access private
 */
function decodeUsernameToEmail(username) {
  const pos = username.lastIndexOf('..');
  if (pos === -1) {
    return username;
  }

  return `${username.substr(0, pos)}@${username.substr(pos + 2)}`;
}

/**
 * @class Auth
 * @classdesc Auth class implementing an Auth interface for Verdaccio
 * @param {Object} config
 * @param {Object} stuff
 * @returns {Auth}
 * @constructor
 * @access public
 */
function Auth(config, stuff) {
  if (!(this instanceof Auth)) {
    return new Auth(config, stuff);
  }

  this.allow = parseAllow(config.allow);
  this.ttl = (config.ttl || cache.CACHE_TTL) * 1000;
  this.Bitbucket = Bitbucket2;
  this.logger = stuff.logger;
}

/**
 * Logs a given error
 * This is private method running in context of Auth object
 *
 * @param {object} logger
 * @param {string} err
 * @param {string} username
 * @access private
 */
const logError = (logger, err, username) => {
  logger.warn(`${err.code}, user: ${username}, Bitbucket API adaptor error: ${err.message}`);
};

/**
 * Performs user authentication by a given credentials
 * On success or failure executing done(err, teams) callback
 *
 * @param {string} username - user name on bitbucket
 * @param {string} password - user password on bitbucket
 * @param {Function} done - success or error callback
 * @access public
 */
Auth.prototype.authenticate = function authenticate(username, password, done) {
  // make sure we keep memory low
  // run in background
  setTimeout(cache.cleanup);

  const user = cache.getCache(username, password);

  if (!cache.empty(user)) {
    return done(null, user.teams);
  }

  const bitbucket = new this.Bitbucket2(decodeUsernameToEmail(username), password);

  return bitbucket.getPrivileges().then((privileges) => {
    const teams = Object.keys(privileges.teams)
      .filter((team) => {
        if (this.allow[team] === undefined) {
          return false;
        }

        if (!this.allow[team].length) {
          return true;
        }

        return this.allow[team].includes(privileges.teams[team]);
      }, this);

    user.teams = teams;
    user.expires = new Date(new Date().getTime() + this.ttl);

    return done(null, teams);
  }).catch((err) => {
    logError(this.logger, err, username);
    return done(err, false);
  });
};

module.exports = Auth;
