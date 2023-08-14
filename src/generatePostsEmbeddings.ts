import { HttpFunction } from "@google-cloud/functions-framework";
import { PineconeClient } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import { createEmbedding } from "./lib/openAIConfig";
import {
  initPineCone,
  upsertPineCone,
  deletePineCone,
  upsertSimilarPineCone,
  deleteSimilarPineCone,
} from "./lib/pineConeConfig";
import { convert } from "html-to-text";
import mongoose, { Types } from "mongoose";
import { Post } from "./models";
import { readFileSync } from "fs";
import tiktokenModel from "@dqbd/tiktoken/encoders/cl100k_base.json";
import { Tiktoken, init } from "@dqbd/tiktoken/lite/init";
import cors from "cors";

dotenv.config();

const wasm = readFileSync(
  "./node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm"
);
const options = {
  wordwrap: 130,
  selectors: [
    { selector: "a", format: "skip" },
    { selector: "img", format: "skip" },
  ],
};

const htmloptions = {
  wordwrap: 130,
  selectors: [{ selector: "img", format: "skip" }],
};

const maxtry = 10;

// db initializtaion
mongoose.set("strictQuery", false);

export const generatePostsEmbeddings: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    try {
      const URL = process.env.MONGO_DB_URL || "";
      await mongoose.connect(URL);
      const initPine = await initPineCone();

      // Init MongoDB pineCount value into 0
      // const initSetOption = {  $set: { pineCount: 0 }  }
      // await Post.updateMany({}, initSetOption);
      // res.send({status: true, message : 'inited'});

      // return ;

      if (initPine) {
        const posts = await Post.find({
          $and: [
            {
              $or: [
                { pineCount: 0 },
                { pineCount: { $exists: false } },
                { pineCount: null },
              ],
            },
            {
              $or: [{ totalVotes: { $gt: 0 } }, { reputation: { $gt: 0 } }],
            },
          ],
        }).select("_id");
        //initToken
        await init((imports) => WebAssembly.instantiate(wasm, imports));

        const encoding = new Tiktoken(
          tiktokenModel.bpe_ranks,
          tiktokenModel.special_tokens,
          tiktokenModel.pat_str
        );
        for (let i = 0; i < posts.length; i++) {
          const temptext = await Post.findById(posts[i]._id)
            .populate("preview")
            .setOptions({
              autoPopulateReplies: true,
            });
          const description = convert(temptext!.text!, options);

          if (temptext?.text && temptext?.text.length > 40) {
            //delete pineconeindex
            const deleteIds = new Array(800)
              .fill(null)
              .map((val, index) => `${posts[i]._id.toString()}-${index + 1}`);
            let deleteTries = 0;
            let deleteFlag = false;
            while (!deleteFlag && deleteTries < maxtry) {
              deleteFlag = await deletePineCone(deleteIds);
              deleteTries++;
            }
            if (!deleteFlag) {
              break;
            }
            let bonusDescLength = 0;
            let previewDescription: any[] = [];
            if (temptext?.preview && (temptext?.preview as any).description) {
              bonusDescLength += (temptext?.preview as any).description.length;
              previewDescription = (temptext?.preview as any).description.split(
                "\n"
              );
            }
            if (temptext?.preview && (temptext?.preview as any).title) {
              bonusDescLength += (temptext?.preview as any).title.length;
              previewDescription = previewDescription.concat(
                (temptext?.preview as any).title.split("\n")
              );
            }
            const sentences = previewDescription.concat(
              description.split("\n")
            );
            let sumTokens = 0;
            let tempList = [];
            let totalCount = 0;
            for (let j = 0; j < sentences.length; j++) {
              const prompt_tokens = encoding.encode(sentences[j]);
              sumTokens += prompt_tokens.length;
              tempList.push(sentences[j]);
              if (sumTokens > 2000 || j == sentences.length - 1) {
                let embedding: number[] = [];
                let numTries = 0;
                const tempText = tempList.join(" ");
                while (embedding.length === 0 && numTries < maxtry) {
                  embedding = await createEmbedding(tempText);
                  numTries++;
                }
                if (embedding.length != 0) {
                  const vectors = [];
                  totalCount++;
                  try {
                    vectors.push({
                      id: `${posts[i]._id.toString()}-${totalCount}`,
                      values: embedding,
                      metadata: {
                        length: description.length + bonusDescLength,
                        id: posts[i]._id.toString(),
                      },
                    });
                    let pineTries = 0;
                    let pineFlag = false;
                    while (!pineFlag && pineTries < maxtry) {
                      pineFlag = await upsertPineCone(vectors);
                      pineTries++;
                    }
                    if (!pineFlag) {
                      console.error("upsert error");
                      totalCount = 0;
                      sumTokens = 0;
                      tempList = [];
                      break;
                    }
                  } catch (error) {
                    totalCount = 0;
                    sumTokens = 0;
                    tempList = [];
                    break;
                  }
                }
                sumTokens = 0;
                tempList = [];
              }
            }
            if (totalCount > 0) {
              try {
                await Post.updateOne(
                  { _id: posts[i]._id },
                  { $set: { pineCount: totalCount } }
                );
              } catch (error) {
                const deleteIds = new Array(totalCount)
                  .fill(null)
                  .map(
                    (val, index) => `${posts[i]._id.toString()}-${index + 1}`
                  );
                let deleteTries = 0;
                let deleteFlag = false;
                while (!deleteFlag && deleteTries < maxtry) {
                  deleteFlag = await deletePineCone(deleteIds);
                  deleteTries++;
                }
              }
            }
          }
        }
        const deleteposts = await Post.find({
          $and: [
            { pineCount: { $gt: 0 } },
            { totalVotes: { $lte: 0 } },
            { reputation: { $lte: 0 } },
          ],
        }).select("_id pineCount");
        for (let i = 0; i < deleteposts.length; i++) {
          const deleteIds = new Array(deleteposts[i].pineCount)
            .fill(null)
            .map(
              (val, index) => `${deleteposts[i]._id.toString()}-${index + 1}`
            );
          let deleteTries = 0;
          let deleteFlag = false;
          while (!deleteFlag && deleteTries < maxtry) {
            deleteFlag = await deletePineCone(deleteIds);
            deleteTries++;
          }
          if (deleteFlag) {
            await Post.updateOne(
              { _id: deleteposts[i]._id },
              { $set: { pineCount: 0 } }
            );
          }
        }
        //generate embedding for similar posts function
        const similarposts = await Post.find({
          $and: [
            {
              $or: [
                { createdEmbedding: false },
                { createdEmbedding: { $exists: false } },
                { createdEmbedding: null },
              ],
            },
            {
              $or: [{ totalVotes: { $gt: 0 } }, { reputation: { $gt: 0 } }],
            },
          ],
        }).select("_id");
        for (let i = 0; i < similarposts.length; i++) {
          const temptext = await Post.findById(similarposts[i]._id)
            .populate("preview")
            .setOptions({
              autoPopulateReplies: true,
            })
            .select("text preview");
          let tempTitle = "";
          let tempDes = "";
          if (temptext?.preview && (temptext?.preview as any).description) {
            tempDes = (temptext?.preview as any).description;
          }
          if (temptext?.preview && (temptext?.preview as any).title) {
            tempTitle = (temptext?.preview as any).title;
          }

          const description =
            convert(temptext!.text!, options) + tempTitle + tempDes;

          if (temptext && (temptext as any).length > 30) {
            try {
              let embedding: number[] = [];
              let numTries = 0;
              while (embedding.length === 0 && numTries < maxtry) {
                embedding = await createEmbedding(description);
                numTries++;
              }
              if (embedding.length != 0) {
                const vectors = [];
                vectors.push({
                  id: `${similarposts[i]._id.toString()}`,
                  values: embedding,
                  metadata: {
                    id: similarposts[i]._id.toString(),
                  },
                });

                let pineTries = 0;
                let pineFlag = false;
                while (!pineFlag && pineTries < maxtry) {
                  pineFlag = await upsertSimilarPineCone(vectors);
                  pineTries++;
                }
                if (pineFlag) {
                  await Post.updateOne(
                    { _id: similarposts[i]._id },
                    { $set: { createdEmbedding: true } }
                  );
                }
              }
            } catch (error) {
              console.log(error);
            }
          }
        }
        const deleteSimilarposts = await Post.find({
          $and: [
            { createdEmbedding: true },
            { totalVotes: { $lte: 0 } },
            { reputation: { $lte: 0 } },
          ],
        }).select("_id");
        for (let i = 0; i < deleteSimilarposts.length; i++) {
          let deleteTries = 0;
          let deleteFlag = false;
          while (!deleteFlag && deleteTries < maxtry) {
            deleteFlag = await deleteSimilarPineCone([
              deleteSimilarposts[i]._id.toString(),
            ]);
            deleteTries++;
          }
          if (deleteFlag) {
            await Post.updateOne(
              { _id: deleteSimilarposts[i]._id },
              { $set: { createdEmbedding: false } }
            );
          }
        }
        res.send({ status: true });
      } else {
        res.send({ status: false, message: "Init PineCone error" });
      }
    } catch (error) {
      console.log(error);
      res.send({ status: false, message: error });
    }
  });
};
