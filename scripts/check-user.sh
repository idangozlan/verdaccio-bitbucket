#!/bin/bash

# Call the Bitbucket API to see what it returns for a given user.

set -e

npm run build

echo -n "Username: "
read -r USERNAME

echo -n "Password: "
read -sr PASSWORD
echo

define(){ IFS='\n' read -r -d '' ${1} || true; }
define SOURCE <<'EOF'
    const dir = process.argv[1];
    const username = process.argv[2];
    const password = process.argv[3];
    const Bitbucket = require(`${dir}/../lib/models/Bitbucket`);
    new Bitbucket(username, password, console).getPrivileges().then((result) => {
        console.log('%j', result);
    }).catch((err) => {
        console.error(`ERROR: ${err.code}, user: ${username}, Bitbucket API error: ${err.message}`);
    });
EOF

node -e "$SOURCE" -- "$(dirname "$0")" "$USERNAME" "$PASSWORD"
