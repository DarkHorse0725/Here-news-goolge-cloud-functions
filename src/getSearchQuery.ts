import { HttpFunction } from "@google-cloud/functions-framework";
import { PineconeClient } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import { createEmbedding } from "./lib/openAIConfig";
import mongoose, { Types } from "mongoose";
import { Post } from "./models";
import { Preview } from "./models";
import cors from "cors";

dotenv.config();
mongoose.set("strictQuery", false);

export const getSearchQuery: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const { search, step, offset, similarity, orderBy, sort } = req.body;

    if (!step || !search || offset == undefined) {
      res.send({ result: [], message: "Incorrect Parameter." });
      return;
    }
    if (search?.length == 0 || step == 0 || offset < 0) {
      res.send({ result: [], message: "Incorrect Parameters." });
      return;
    }

    let pSimilarity =
      typeof similarity === "number" && similarity >= 0 && similarity <= 1
        ? similarity
        : 0.5;
    let pOrderBy =
      parseInt(orderBy) === 0 ||
      parseInt(orderBy) === 1 ||
      parseInt(orderBy) === 2
        ? parseInt(orderBy)
        : 2; // 0 is reputation, 1 is time, 2 is similarity, default is 2
    let pSort =
      pOrderBy === 2
        ? 1
        : parseInt(sort) === 1 || parseInt(sort) === -1
        ? sort
        : -1; // 1 is asc, -1 desc
    const embeddings = await createEmbedding(String(search));
    if (embeddings.length == 0) {
      res.send([]);
      return;
    }
    let matches: any[] = [];
    let final: any[] = [];
    try {
      const URL = process.env.MONGO_DB_URL || "";
      await mongoose.connect(URL);
      const pinecone = new PineconeClient();
      await pinecone.init({
        environment: process.env.PINECONE_ENV || "",
        apiKey: process.env.PINECONE_API_KEY || "",
      });
      const pineindex = pinecone.Index("openai");
      const queryRequest = {
        vector: embeddings,
        topK: 500,
        filter: { length: { $gt: 20 } },
        includeMetadata: true,
        namespace: "openai-index",
      };
      const queryResponse = await pineindex.query({ queryRequest });
      const results = queryResponse.matches!;
      const uniqueIds = new Set();
      const resultIds: string[] = [];

      results.forEach((val) => {  
        if (val.score! < pSimilarity) return;
        if (!uniqueIds.has(val.id.split("-")[0])) {
          uniqueIds.add(val.id.split("-")[0]);
          resultIds.push(val.id.split("-")[0]);
        }
      });
      const postIds = resultIds!.map((val: any) => new Types.ObjectId(val));
      if (postIds.length != 0) {
        let pipeline: mongoose.PipelineStage[] = [
          {
            $match: {
              _id: {
                $in: postIds,
              },
            },
          },
        ];
        if (pOrderBy == 0) {
          pipeline.push({
            $sort: { reputation: pSort == 1 ? 1 : -1 },
          });
        }
        if (pOrderBy == 1) {
          pipeline.push({
            $sort: { createdAt: pSort == 1 ? 1 : -1 },
          });
        }
        if (pOrderBy == 2) {
          pipeline.push({
            $addFields: {
              order: {
                $indexOfArray: [postIds, "$_id"],
              },
            },
          });
          pipeline.push({
            $sort: {
              order: pSort == 1 ? 1 : -1,
            },
          });
        }
        pipeline.push({
          $skip: Number(offset) * Number(step),
        });
        pipeline.push({
          $limit: Number(step),
        });
        pipeline = [
          ...pipeline,
          ...[
            {
              $lookup: {
                from: "users",
                let: { userId: "$userId" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$userId"],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      displayName: 1,
                      reputation: 1,
                      userIdHash: 1,
                      avatar: 1,
                      verified: 1,
                    },
                  },
                ],
                as: "userId",
              },
            },
            {
              $unwind: {
                path: "$userId",
              },
            },
            {
              $project: {
                userId: 1,
                title: 1,
                text: 1,
                meta: 1,
                images: 1,
                createdAt: 1,
                upvotes: 1,
                downvotes: 1,
                totalVotes: 1,
                preview: 1,
                replies: 1,
                repliedTo: 1,
                reputation: 1,
                postId: 1,
                permalink: 1,
              },
            },
          ],
        ];
        matches = await Post.aggregate(pipeline);
        final = await Preview.populate(matches, { path: "preview" });
      }
    } catch (error) {
      console.log(error);
    }
    res.send({ result: final });
  });
};
