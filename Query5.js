const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

const mongoClient = new MongoClient('mongodb://localhost:27017');
const redisClient = createClient({ url: 'redis://localhost:6379' });

async function main() {
  await mongoClient.connect();
  await redisClient.connect();

  const col = mongoClient.db('ieeevisTweets').collection('tweet');

  // Track first occurrence of each user to reset their list key (idempotency)
  const seenUsers = new Set();

  const cursor = col.find({});
  for await (const tweet of cursor) {
    const screenName = tweet.user?.screen_name;
    const idStr = tweet.id_str;
    if (!screenName || !idStr) continue;

    // On first encounter, clear any existing list for this user
    if (!seenUsers.has(screenName)) {
      await redisClient.del(`tweets:${screenName}`);
      seenUsers.add(screenName);
    }

    // Push tweet id onto the user's list
    await redisClient.lPush(`tweets:${screenName}`, idStr);

    // Store tweet data in a hash
    await redisClient.hSet(`tweet:${idStr}`, {
      user_name:   tweet.user.name          || '',
      screen_name: screenName,
      text:        tweet.text               || '',
      created_at:  tweet.created_at         || '',
      favorites:   String(tweet.favorite_count ?? 0),
      retweets:    String(tweet.retweet_count   ?? 0),
    });
  }

  console.log(`Populated lists and hashes for ${seenUsers.size} users.\n`);

  // Demonstration: find the top user by tweet count from MongoDB
  const [topUser] = await col.aggregate([
    { $group: { _id: '$user.screen_name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]).toArray();

  const demoUser = topUser._id;

  // Get all tweet IDs for this user from Redis
  const tweetIds = await redisClient.lRange(`tweets:${demoUser}`, 0, -1);
  console.log(`Tweets by @${demoUser} (${tweetIds.length} total):`);
  console.log('Tweet IDs:', tweetIds);

  // Look up the full hash for the first tweet
  const tweetData = await redisClient.hGetAll(`tweet:${tweetIds[0]}`);
  console.log(`\nHash for tweet:${tweetIds[0]}:`);
  console.log(tweetData);

  await mongoClient.close();
  await redisClient.quit();
}

main().catch(console.error);
