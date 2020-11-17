[![Build Status](https://travis-ci.org/idangozlan/verdaccio-bitbucket.svg?branch=master)](https://travis-ci.org/idangozlan/verdaccio-bitbucket)
[![Download Status](https://img.shields.io/npm/dm/verdaccio-bitbucket.svg)](https://www.npmjs.com/package/verdaccio-bitbucket)
[![Download Status](https://img.shields.io/npm/v/verdaccio-bitbucket.svg)](https://www.npmjs.com/package/verdaccio-bitbucket)

# Verdaccio Module For User Auth Via Bitbucket

This module provides an engine for Verdaccio to make user authorizations via 
Bitbucket 2.0 API.

## Install

As simple as running:

    $ npm install -g verdaccio-bitbucket

## Configure

    auth:
      bitbucket:
        allow: TeamOne(owner), TeamX(owner|collaborator|member), TeamZ
        ttl: 604800 # 7 days
        defaultMailDomain: gmail.com
        hashPassword: true
        cache: redis
        redis:
            host: '127.0.0.1'
            port: 6379
            prefix: 'verdaccio-bitbucket:'
    ...
    packages:
      '@myscope/*':
        allow_access: TeamZ
        allow_publish: TeamOne, TeamX # restrict to bitbucket teams


#### Auth Config
| Key               | Description                                                                                                                                                   | Options              | Default value |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|---------------|
| `allow`             | Bitbucket teams which should be allowed to access the registry, separated by user groups and commas. For ex. TeamOne(owner), TeamX(owner|collaborator|member), TeamZ | {string}             | null          |
| `ttl`               | Time-to-live of cache (seconds). For ex. 604800 = 7 days                                                                                                      | {number}             | 604800        |
| `defaultMailDomain` | Specify a default domain for the username, For ex. "gmail.com"                                                                                                | {string}             | null          |
| `hashPassword`      | When using cache, it will save the passwords hashed (highly recommended)                                                                                      | {true|false}         | true          |
| `cache`             | Caching engine to prevent re-accessing bitbucket servers. For Production usage and scaling, Redis is highly recommended                                       | redis|in-memory|null | null          |
| `redis`             | YAML Nested Map of options for Redis Client creation (look on the config sample). Read more https://github.com/NodeRedis/node_redis                           | YAML Nested Map      |               |

* `hashPassword` option is currently not supported by `verdaccio/verdaccio` docker image, since it's running on Linux Alpine without the `bcrypt` required packages.

### How does it work?

User provides a login/password which he uses to perform auth on Bitbucket.
Verdaccio will grant access to the user only if he matches the teams and roles
from the configured "allow" option.

This option provides a way to specify which teams and their roles should be
authorized by Verdaccio. If team name is set without roles it would be treated
as any role grants a successful sign in for the user. Controversial, if roles 
are specified within the team, Verdaccio will check if signed user has an
appropriate role in the team.

After this it is becomes possible to configure team-based access to the packages
as seen on config example above.

### Logging In

To log in using NPM, run:

```
    npm adduser --registry  https://your.registry.local
```
Since the username for Bitbucket is the email addresses 
and cannot contain `@`, replace the `@` with two periods `..`
The email address is then parsed and converted to a normal email address for authentication

Alternatively you can specify the `defaultMailDomain` configuration option,
if most (or all) your users use the same mail provider or an own mail server.
In this case the users have to provide only the local-part of there Bitbucket
email address (the part before the `@`) as a username.
It is still possible to override the default domain via the `..` convention
mentioned above.

### Notes

Please be aware, that self-hosted "Bitbucket Server" are not supported. If you need support for Bitbucket Server please refer to [verdaccio-bitbucket-server](https://github.com/oeph/verdaccio-bitbucket-server).

It is currently not supported adding Bitbucket user via npm command line.
Maybe I will add this option in the future if there would be such need.
If you want to help improve this module - feel free to contribute or do whatever
you want. License is MIT, as usual.
