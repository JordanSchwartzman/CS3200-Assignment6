const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

const mongoClient = new MongoClient('mongodb://localhost:27017');
const redisClient = createClient({ url: 'redis://localhost:6379' });

async function main() {
  await mongoClient.connect();
  await redisClient.connect();

  const col = mongoClient.db('ieeevisTweets').collection('tweet');

  await redisClient.set('tweetCount', 0);

  const cursor = col.find({});
  for await (const tweet of cursor) {
    await redisClient.incr('tweetCount');
  }

  const count = await redisClient.get('tweetCount');
  console.log(`There were ${count} tweets`);

  await mongoClient.close();
  await redisClient.quit();
}

main().catch(console.error);
