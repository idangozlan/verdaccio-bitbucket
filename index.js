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
 * Parses config allow option and returns result
 *
 * @param {string} allow - string to parse
 * @returns {Object}
 * @access private
 */
function parseAllow(allow) {
    var result = {};

    allow.split(/\s*,\s*/).forEach(function (team) {
        var team = team.trim().match(/^(.*?)(\((.*?)\))?$/);

        result[team[1]] = team[3] ? team[3].split('|') : [];
    });

    return result;
}

/**
 * Checks if a given cache object should be treated as empty
 *
 * @param {{teams: {Array}, expires: {Date}}} cache
 * @returns {boolean}
 */
function empty (cache) {
    if (!cache ||
        !(cache.teams instanceof Array) ||
        !(cache.expires instanceof Date)
    ) {
        return true;
    }

    return new Date().getTime() < cache.expires.getTime();
};

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
    if (!(this instanceof Auth)) {
        return new Auth(config, stuff);
    }

    this.allow = parseAllow(config.allow);
    this.ttl = (config.ttl || CACHE_TTL) * 1000;
    this.bitbucket = null;
    this.userCache = {};
    this.logger = stuff.logger;
}

/**
 * Returns cached record for a given user
 * This is private method running in context of Auth object
 *
 * @param {string} username
 * @param {string} password
 * @returns {{teams: {Array}, expires: {Date}}}
 */
var getCache = function (username, password) {
    var shasum = crypto.createHash('sha1');

    shasum.update(JSON.stringify({
        username: username,
        password: password
    }));

    var token = shasum.digest('hex');

    if (!this.userCache[token]) {
        this.userCache[token] = {};
    }

    return this.userCache[token];
};

/**
 * Logs a given error
 * This is private method running in context of Auth object
 *
 * @param {string} err
 * @param {string} username
 * @access private
 */
var logError = function(err, username) {
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
Auth.prototype.authenticate = function(username, password, done) {
    var credentials = {
        username: username,
        password: password
    };

    var cache = getCache.call(this, username, password);

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

                    if (this.allow[team].length == 0) {
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
 * So this method will always fail
 *
 * @param {string} username - user name to add
 * @param {string} password - user password
 * @param done - success or failure callback
 */
Auth.prototype.add_user = function(username, password, done) {
    var err = new Error('Adding users not supported for this registry');

    logError(err, username);
    done(err, false);
};

module.exports = Auth;
