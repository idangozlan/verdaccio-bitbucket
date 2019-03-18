const Crypto = require('crypto');

/**
 * Default cache time-to-live in seconds
 * It could be changed via config ttl option,
 * which should be also defined in seconds
 *
 * @type {number}
 * @access private
 */
const CACHE_TTL = 24 * 60 * 60;

/**
 * Cache cleanup time-to-live flag in seconds
 * It is used to run cleanup of the users cache once per given period
 * to remove garbage out of the memory
 *
 * @type {number}
 * @access private
 */
const CLEANUP_TTL = 60 * 60;

/**
 * Users cache storage
 *
 * @type {Object}
 * @access private
 */
const userCache = {};

/**
 * Time cleanup
 * @type {Date}
 * @access private
 */
let lastCleanup = new Date();

/**
 * Checks if a given cache object should be treated as empty
 *
 * @param {{teams: {Array}, expires: {Date}}} cache
 * @returns {boolean}
 * @access private
 */
function empty(cache) {
  if (!cache
        || !(cache.teams instanceof Array)
        || !(cache.expires instanceof Date)
  ) {
    return true;
  }

  return new Date() >= cache.expires;
}

/**
 * Removes all expired users from a cache
 *
 * @access private
 */
function cleanup() {
  if (new Date().getTime() - lastCleanup.getTime() < CLEANUP_TTL) {
    return;
  }

  Object.keys(userCache).forEach((hash) => {
    if (empty(userCache[hash])) {
      userCache[hash] = null;
      delete userCache[hash];
    }
  });

  lastCleanup = new Date();
}

/**
 * Removes all users from a cache
 *
 * @access private
 */
function clear() {
  Object.keys(userCache).forEach((hash) => {
    userCache[hash] = null;
    delete userCache[hash];
  });

  lastCleanup = new Date();
}

/**
 * Returns cached record for a given user
 * This is private method running in context of Auth object
 *
 * @param {string} username
 * @param {string} password
 * @returns {{teams: {Array}, expires: {Date}}}
 * @access private
 */
function getCache(username, password) {
  const shasum = Crypto.createHash('sha1');

  shasum.update(JSON.stringify({
    username,
    password,
  }));

  const token = shasum.digest('hex');

  if (!userCache[token]) {
    userCache[token] = {};
  }

  return userCache[token];
}

module.exports = {
  CACHE_TTL,
  CLEANUP_TTL,
  userCache,
  lastCleanup,
  empty,
  cleanup,
  clear,
  getCache,
};
