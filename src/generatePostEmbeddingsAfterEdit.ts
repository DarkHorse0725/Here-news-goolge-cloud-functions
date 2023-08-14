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

export const generatePostEmbeddingsAfterEdit: HttpFunction = async (
  req,
  res
) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    try {
      const { post_id } = req.body;
      const URL = process.env.MONGO_DB_URL || "";
      await mongoose.connect(URL);
      const initPine = await initPineCone();

      if (initPine) {
        //initToken
        await init((imports) => WebAssembly.instantiate(wasm, imports));

        const encoding = new Tiktoken(
          tiktokenModel.bpe_ranks,
          tiktokenModel.special_tokens,
          tiktokenModel.pat_str
        );
        const temptext = await Post.findById(post_id)
          .populate("preview")
          .setOptions({
            autoPopulateReplies: true,
          });
        const description = convert(temptext!.text!, options);
        if (temptext?.text && temptext?.text.length > 40) {
          //delete pineconeindex
          const deleteIds = new Array(800)
            .fill(null)
            .map((val, index) => `${post_id.toString()}-${index + 1}`);
          let deleteTries = 0;
          let deleteFlag = false;
          while (!deleteFlag && deleteTries < maxtry) {
            deleteFlag = await deletePineCone(deleteIds);
            deleteTries++;
          }
          console.log('deleteFlag = ', deleteFlag)
          if (!deleteFlag) {

            res.send({ status: false, err: "pinecone error" });
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
          const sentences = previewDescription.concat(description.split("\n"));
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
                    id: `${post_id.toString()}-${totalCount}`,
                    values: embedding,
                    metadata: {
                      length: description.length + bonusDescLength,
                      id: post_id.toString(),
                    },
                  });
                  let pineTries = 0;
                  let pineFlag = false;
                  while (!pineFlag && pineTries < maxtry) {
                    pineFlag = await upsertPineCone(vectors);
                    pineTries++;
                  }
                  console.log('pineFlag = ', pineFlag)
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
                { _id: post_id },
                { $set: { pineCount: totalCount } }
              );
            } catch (error) {
              const deleteIds = new Array(totalCount)
                .fill(null)
                .map((val, index) => `${post_id.toString()}-${index + 1}`);
              let deleteTries = 0;
              let deleteFlag = false;
              while (!deleteFlag && deleteTries < maxtry) {
                deleteFlag = await deletePineCone(deleteIds);
                deleteTries++;
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
        const temptext2 = await Post.findById(post_id)
          .populate("preview")
          .setOptions({
            autoPopulateReplies: true,
          })
          .select("text preview");
        let tempTitle = "";
        let tempDes = "";
        if (temptext2?.preview && (temptext2?.preview as any).description) {
          tempDes = (temptext2?.preview as any).description;
        }
        if (temptext2?.preview && (temptext2?.preview as any).title) {
          tempTitle = (temptext2?.preview as any).title;
        }

        const description2 =
          convert(temptext2!.text!, options) + tempTitle + tempDes;
        if (temptext2 && (temptext2 as any).length > 30) {
          try {
            let embedding: number[] = [];
            let numTries = 0;
            while (embedding.length === 0 && numTries < maxtry) {
              embedding = await createEmbedding(description2);
              numTries++;
            }
            if (embedding.length != 0) {
              const vectors = [];
              vectors.push({
                id: `${post_id.toString()}`,
                values: embedding,
                metadata: {
                  id: post_id.toString(),
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
                  { _id: post_id },
                  { $set: { createdEmbedding: true } }
                );
              }
            }
          } catch (error) {
            console.log(error);
          }
        }
        let deleteTries = 0;
        let deleteFlag = false;
        while (!deleteFlag && deleteTries < maxtry) {
          deleteFlag = await deleteSimilarPineCone([post_id.toString()]);
          deleteTries++;
        }
        if (deleteFlag) {
          await Post.updateOne(
            { _id: post_id },
            { $set: { createdEmbedding: false } }
          );
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
