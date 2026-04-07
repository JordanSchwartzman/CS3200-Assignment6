const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

const mongoClient = new MongoClient('mongodb://localhost:27017');
const redisClient = createClient({ url: 'redis://localhost:6379' });

async function main() {
  await mongoClient.connect();
  await redisClient.connect();

  const col = mongoClient.db('ieeevisTweets').collection('tweet');

  await redisClient.set('favoritesSum', 0);

  const cursor = col.find({});
  for await (const tweet of cursor) {
    const fav = parseInt(tweet.favorite_count) || 0;
    await redisClient.incrBy('favoritesSum', fav);
  }

  const total = await redisClient.get('favoritesSum');
  console.log(`Total number of favorites: ${total}`);

  await mongoClient.close();
  await redisClient.quit();
}

main().catch(console.error);
