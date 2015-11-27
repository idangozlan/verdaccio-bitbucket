# Sinopia Module For User Auth Via Bitbucket

This module provides an engine for Sinopia to make user authorizations via 
Bitbucket API.

## Install

As simple as running:

    $ npm install -g sinopia-bitbucket

## Configure

    auth:
      bitbucket:
        ttl: 604800 # make cache live for 7 days
        allow: TeamOne(admin), TeamX(admin|collaborator), TeamZ
    ...
    packages:
      '@myscope/*':
        allow_access: $authenticated
        allow_publish: TeamOne, TeamX # restrict to bitbucket teams