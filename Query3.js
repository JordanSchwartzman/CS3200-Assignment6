const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

const mongoClient = new MongoClient('mongodb://localhost:27017');
const redisClient = createClient({ url: 'redis://localhost:6379' });

async function main() {
  await mongoClient.connect();
  await redisClient.connect();

  const col = mongoClient.db('ieeevisTweets').collection('tweet');

  await redisClient.del('screen_names');

  const cursor = col.find({});
  for await (const tweet of cursor) {
    if (tweet.user?.screen_name) {
      await redisClient.sAdd('screen_names', tweet.user.screen_name);
    }
  }

  const uniqueUsers = await redisClient.sCard('screen_names');
  console.log(`Distinct users: ${uniqueUsers}`);

  await mongoClient.close();
  await redisClient.quit();
}

main().catch(console.error);
