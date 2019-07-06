const redis = require('redis');
const { promisify } = require('util');

const getClient = (redisOptions) => {
  const client = redis.createClient(redisOptions);
  const get = promisify(client.get).bind(client);
  const set = promisify(client.set).bind(client);

  return {
    get,
    set,
  };
};

module.exports = getClient;
