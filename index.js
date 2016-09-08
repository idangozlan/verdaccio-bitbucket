/*jshint esnext: true */
/*!
 * Sinopia plugin for authentication users via Bitbucket
 *
 * @author Mykhailo Stadnyk <mikhus@gmail.com>
 */

var crypto = require('crypto');
var bitbucket = require('bitbucket-api');

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
var userCache = {};

/**
 * Time cleanup
 * @type {Date}
 * @access private
 */
var lastCleanup = new Date();

/**
 * Parses config allow option and returns result
 *
 * @param {string} allow - string to parse
 * @returns {Object}
 * @access private
 */
function parseAllow (allow) {
    'use strict';

    var result = {};

    allow.split(/\s*,\s*/).forEach(function (team) {
        team = team.trim().match(/^(.*?)(\((.*?)\))?$/);

        result[team[1]] = team[3] ? team[3].split('|') : [];
    });

    return result;
}

/**
 * Checks if a given cache object should be treated as empty
 *
 * @param {{teams: {Array}, expires: {Date}}} cache
 * @returns {boolean}
 * @access private
 */
function empty (cache) {
    'use strict';

    if (!cache ||
        !(cache.teams instanceof Array) ||
        !(cache.expires instanceof Date)
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
function cleanup () {
    'use strict';

    if (new Date().getTime() - lastCleanup.getTime() < CLEANUP_TTL) {
        return ;
    }

    Object.keys(userCache).forEach(function (hash) {
        if (empty(userCache[hash])) {
            userCache[hash] = null;
            delete userCache[hash];
        }
    });

    lastCleanup = new Date();
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
    var pos = username.lastIndexOf('..');
    if (pos === -1) {
        return username;
    }
  
    return username.substr(0, pos) + '@' + username.substr(pos + 2);
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
function getCache (username, password) {
    'use strict';

    var shasum = crypto.createHash('sha1');

    shasum.update(JSON.stringify({
        username: decodeUsernameToEmail(username),
        password: password
    }));

    var token = shasum.digest('hex');

    if (!userCache[token]) {
        userCache[token] = {};
    }

    return userCache[token];
}

/**
 * @class Auth
 * @classdesc Auth class implementing an Auth interface for Sinopia
 * @param {Object} config
 * @param {Object} stuff
 * @returns {Auth}
 * @constructor
 * @access public
 */
function Auth (config, stuff) {
    'use strict';

    if (!(this instanceof Auth)) {
        return new Auth(config, stuff);
    }

    this.allow = parseAllow(config.allow);
    this.ttl = (config.ttl || CACHE_TTL) * 1000;
    this.bitbucket = null;
    this.logger = stuff.logger;
}

/**
 * Logs a given error
 * This is private method running in context of Auth object
 *
 * @param {string} err
 * @param {string} username
 * @access private
 */
var logError = function (err, username) {
    'use strict';

    this.logger.warn({
            username: username,
            errMsg: err.message,
            code: err.code
        },
        '@{code}, user: @{username}, BITBUCKER error: @{errMsg}'
    );
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
Auth.prototype.authenticate = function (username, password, done) {
    'use strict';

    var credentials = {
        username: username,
        password: password
    };

    // make sure we keep memory low
    // run in background
    setTimeout(cleanup);

    var cache = getCache(username, password);

    if (!empty(cache)) {
        return done(null, cache.teams);
    }

    this.bitbucket = bitbucket.createClient(credentials);

    this.bitbucket.user().get(function (err, user) {
        if (err) {
            logError.call(this, err, username);
            return done(err, false);
        }

        this.bitbucket.user().privileges(function (err, privileges) {
            if (err) {
                logError.call(this, err, username);
                return done(err, false);
            }

            var teams = Object.keys(privileges.teams)
                .filter(function (team) {
                    if (this.allow[team] === undefined) {
                        return false;
                    }

                    if (!this.allow[team].length) {
                        return true;
                    }

                    return ~this.allow[team].indexOf(privileges.teams[team]);
                }, this);

            cache.teams = teams;
            cache.expires = new Date(new Date().getTime() + this.ttl);

            done(null, teams);
        }.bind(this));
    }.bind(this));
};

/**
 * Adding a new user
 * Currently we do not support adding bitbucket users via private npm registry
 * So this method is simplay alias for Auth.authenticate()
 *
 * @see {@link Auth#authenticate}
 * @param {string} username - user name to add
 * @param {string} password - user password
 * @param done - success or failure callback
 * @access public
 */
Auth.prototype.add_user = function (username, password, done) {
    'use strict';

    this.authenticate.apply(this, arguments);
};

module.exports = Auth;
