import { Bot } from '@skyware/bot';

import { BSKY_IDENTIFIER, BSKY_PASSWORD } from './config.js';
import { LABELS, INTRO_POST } from './constants.js';

const bot = new Bot();

try {
  await bot.login({
    identifier: BSKY_IDENTIFIER,
    password: BSKY_PASSWORD,
  });
} catch (error) {
  console.error('Error logging in: ', error);
  process.exit(1);
}

process.stdout.write('WARNING: This will only add posts for new labels (without rkey configured). Are you sure you want to continue? (y/n) ');

const answer = await new Promise((resolve) => {
  process.stdin.once('data', (data) => {
    resolve(data.toString().trim().toLowerCase());
  });
});

if (answer === 'y') {
  console.log('New posts will be added now.');
} else {
  console.log('Operation cancelled.');
  process.exit(0);
}

let post = null;
if (!INTRO_POST) {
  post = await bot.post({
    text: 'Like the replies to this post to receive labels.',
    threadgate: { allowLists: [] },
});
} else {
  let posts = await bot.getUserPosts(BSKY_IDENTIFIER, { limit: 100 });

  for (let botPost of posts.posts) {
    if (botPost.uri.includes(INTRO_POST)) {
      post = botPost;
      break;
    }
  };
}

if (post === null) {
  console.log('No post data available.');
  process.exit(0);
}

const labelRkeys: Record<string, string> = {};
for (let label of LABELS) {
  if (label.rkey === '') { // Only make new posts for labels without rkeys.
    let labelName = label.locales.map((locale) => locale.name).join(' | ');
    const labelPost = await post.reply({ text: labelName });
    labelRkeys[labelName] = labelPost.uri.split('/').pop()!;
  }
}

console.log('Label rkeys:');
for (const [name, rkey] of Object.entries(labelRkeys)) {
  console.log(`    name: '${name}',`);
  console.log(`    rkey: '${rkey}',`);
}

process.exit(0);

const deletePost = await bot.post({ text: 'Like this post to delete all labels.' });
const deletePostRkey = deletePost.uri.split('/').pop()!;
console.log('Delete post rkey:');
console.log(`export const DELETE = '${deletePostRkey}';`);

process.exit(0);
