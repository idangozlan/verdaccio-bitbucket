`verdaccio-bitbucket` is a fork of `sinopia-bitbucket`. It aims to keep backwards compatibility with sinopia, while keeping up with npm changes.

# Verdaccio Module For User Auth Via Bitbucket

This module provides an engine for Verdaccio to make user authorizations via 
Bitbucket API.

## Install

As simple as running:

    $ npm install -g sinopia-bitbucket

## Configure

    auth:
      bitbucket:
        allow: TeamOne(admin), TeamX(admin|collaborator), TeamZ
        ttl: 604800 # make cache live for 7 days, optional, default = 1 day
    ...
    packages:
      '@myscope/*':
        allow_access: TeamZ
        allow_publish: TeamOne, TeamX # restrict to bitbucket teams

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

### Notes

It is currently not supported adding Bitbucket user via npm command line.
Maybe I will add this option in the future if there would be such need.
If you want to help improve this module - feel free to contribute or do whatever
you want. License is MIT, as usual.
