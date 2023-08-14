import { HttpFunction } from '@google-cloud/functions-framework';
import dotenv from 'dotenv'
import { createEmbedding , generateSummary} from "./lib/openAIConfig"
import mongoose, { Types } from 'mongoose';
import { convert } from 'html-to-text';
import { Post } from './models';

dotenv.config()
const options = {
    wordwrap: 130,
    selectors: [{ selector: 'a', format: 'skip' },
    { selector: 'img', format: 'skip' }]
}

mongoose.set('strictQuery', false)

export const generateSummarizeText: HttpFunction = async (req, res) => {
    const { post_id } = req.body
    if (!post_id) {
        return res.send({ status: false, message: "Please input correct id" })
    }
    if (post_id.length == 0) {
        return res.send({ status: false, message: "Please input correct id" })
    }
    try {
        const URL = process.env.MONGO_DB_URL || ''
        await mongoose.connect(URL)
        const text = await Post.findById(new Types.ObjectId(post_id)).select('text');
        const description = convert(text!.text!, options)
        const summary = await generateSummary(description);
        res.send({summary: summary});
    } catch (error) {
        console.log(error)
        res.send({error: error});
    }

}