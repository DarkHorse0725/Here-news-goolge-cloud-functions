# NewGPT Service (V0.1.1)

**getSearchQuery**

This function generating top relative posts about search query.

```javascript
async function getSearchQuery(search: string, step: number, offset: number): Promise<Post[]> {}
```

Parameters:

- `search` (string): The search query to be used for searching posts.
- `step` (number): The limit number of pagination.
- `offset` (number): The index number of pagination.
- `orderBy` (number): The type of order 0 is reputation, 1 is time, 2 is similarity, default is 2.
- `similarity` (number): The minumum number of similarity. default is 0.5

Return Value:

- A Promise that resolves to an array of `Post` objects representing the matching posts.

Example Usage:

```javascript
import axios from 'axios';

async function main() {
  const searchQuery = 'machine learning';
  const step = 10;
  const offset = 0;
  const orderBy = 0;
  const similarity = 0.6;

  const response = await axios.post('https://us-central1-phonic-jetty-356702.cloudfunctions.net/getSearchQuery', {
    search: searchQuery,
    step: step,
    offset: offset
  });

  const matchingPosts = response.data.results;

  console.log(matchingPosts);
}
```

**getSimilarPosts**

This function generating top relative posts about selected Post.

```javascript
async function getSimilarPosts(post_id: string, step: number, offset: number): Promise<Post[]> {}
```

Parameters:

- `post_id` (string): The selected Post id.
- `step` (number): The limit number of pagination.
- `offset` (number): The index number of pagination.
- `orderBy` (number): The type of order 0 is reputation, 1 is time, 2 is similarity, default is 2.
- `similarity` (number): The minumum number of similarity. default is 0.5

Return Value:

- A Promise that resolves to an array of `Post` objects representing the matching posts.

Example Usage:

```javascript
import axios from 'axios';

async function main() {
  const post_id = '6443fc6fd3bbf736f9e0ac8b';
  const step = 10;
  const offset = 0;
  const orderBy = 0;
  const similarity = 0.6;

  const response = await axios.post('https://us-central1-phonic-jetty-356702.cloudfunctions.net/getSimilarPosts', {
    post_id: post_id,
    step: step,
    offset: offset
  });

  const matchingPosts = response.data.results;

  console.log(matchingPosts);
}
```

**generatePostEmbeddings**

This function is generating embeddings about high value posts.
It's running every 10 mins by google scheduler.

```javascript
async function generatePostEmbeddings(): Promise<boolean> {}
```

Parameters:
    no need

Return Value:

- A Promise that resolves to boolean value about generate embeddings result. If success returns true value.

Example Usage:

```javascript
import axios from 'axios';

async function main() {

  const response = await axios.post('https://us-central1-phonic-jetty-356702.cloudfunctions.net/generatePostsEmbeddings');

  const result = response.data;

  console.log(result);
}
```

**generateMetadata**

This function generating Metadata about selected Post.


```javascript
async function generateMetadata(post_id: string): Promise<any> {}
```

Parameters:

- `post_id` (string): The selected Post id.

Return Value:

- A Promise that resolves to an generated meta object.

Example Usage:

```javascript
import axios from 'axios';

async function main() {
  const post_id = '6443fc6fd3bbf736f9e0ac8b';

  const response = await axios.post('https://us-central1-phonic-jetty-356702.cloudfunctions.net/generateMetadata', {
    post_id: post_id
  });

  const metadata = response.data;

  console.log(metadata);
}
```