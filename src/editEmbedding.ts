import { HttpFunction } from '@google-cloud/functions-framework';
import { PineconeClient } from "@pinecone-database/pinecone";
import dotenv from 'dotenv';
import { createEmbedding } from "./lib/openAIConfig";
import { convert } from 'html-to-text';
import mongoose, { Types } from 'mongoose';
import { Post } from './models';

dotenv.config()

const options = {
    wordwrap: 130,
    selectors: [{ selector: 'a', format: 'skip' },
    { selector: 'img', format: 'skip' }]
}
// run every 10 mins

// db initializtaion
mongoose.set('strictQuery', false)

export const editEmbedding: HttpFunction = async (req, res) => {
    const { post_id } = req.body
    if (!post_id) {
        res.send({ status: false })
        return
    }
    if (post_id?.length == 0) {
        res.send({ status: false })
        return
    }
    try {
        const URL = process.env.MONGO_DB_URL || ''
        await mongoose.connect(URL)
        const temptext = await Post.findById(new Types.ObjectId(post_id)).select('text');
        const description = convert(temptext!.text!, options)
        const embedding = await createEmbedding(description)
        if (embedding.length != 0) {
            const pinecone = new PineconeClient();
            await pinecone.init({
                environment: process.env.PINECONE_ENV || '',
                apiKey: process.env.PINECONE_API_KEY || '',
            });
            const pineindex = pinecone.Index("openai");
            const fetchResponse = await pineindex.fetch({
                ids: [post_id],
                namespace: "openai-index",
            });
            if (Object.keys(fetchResponse.vectors!).length === 0) {
                const upsertRequest = {
                    vectors: [
                        {
                            id: post_id,
                            values: embedding,
                            metadata: {
                                length: description.length,
                                id: post_id
                            },
                        }
                    ],
                    namespace: "openai-index",
                };
                const upsertResponse = await pineindex.upsert({ upsertRequest });
            } else {
                const updateRequest = {
                    id: post_id,
                    values: embedding,
                    setMetadata: { length: description.length, id: post_id },
                    namespace: "openai-index",
                  };
                  const updateResponse = await pineindex.update({ updateRequest });
            }
            res.send({ status: true })
        } else {
            res.send({ status: false })
        }
    } catch (error) {
        res.send({ status: false })
    }
}