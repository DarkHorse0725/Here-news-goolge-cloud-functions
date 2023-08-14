import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import { createEmbedding, generateSummary } from "./lib/openAIConfig";
import { convert } from "html-to-text";
import mongoose, { Types } from "mongoose";
import { Post } from "./models";
import { initPineCone, queryPineCone } from "./lib/pineConeConfig";
import cors from "cors";

dotenv.config();

const options = {
  wordwrap: 130,
  selectors: [
    { selector: "a", format: "skip" },
    { selector: "img", format: "skip" },
  ],
};
const maxtry = 10;

// db initializtaion
mongoose.set("strictQuery", false);

export const getSimilarPosts: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    const { post_id, step, offset, similarity, orderBy, sort } = req.body;
    if (!post_id || !step || offset == undefined) {
      res.send({ result: [], message: "Parameter incorrect." });
      return;
    }
    if (post_id?.length == 0 || step == 0 || offset < 0) {
      res.send({ result: [], message: "Parameter incorrect." });
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
    try {
      const URL = process.env.MONGO_DB_URL || "";
      await mongoose.connect(URL);
      const initPine = await initPineCone();
      if (initPine) {
        const tempPost = await Post.findById({ postId: post_id })
          .populate("preview")
          .setOptions({
            autoPopulateReplies: true,
          });
        if (tempPost) {
          let embedding: number[] = [];
          const tempDescription = convert(tempPost!.text!, options).split("\n");
          let totalLen = 0;
          let description = "";
          let tempTitle = "";
          let tempDes = "";
          if (tempPost?.preview && (tempPost?.preview as any).description) {
            tempDes = (tempPost?.preview as any).description;
          }
          if (tempPost?.preview && (tempPost?.preview as any).title) {
            tempTitle = (tempPost?.preview as any).title;
          }

          for (let i = 0; i < tempDescription.length; i++) {
            if (tempDescription[i].length == 0) continue;
            totalLen += tempDescription[i].length;
            if (totalLen > 5000) break;
            description = description + tempDescription[i];
          }

          if (totalLen + tempTitle.length + tempDes.length <= 5000) {
            description = description + tempTitle + tempDes;
          }

          if (description.length > 20) {
            let numTries = 0;
            while (embedding.length === 0 && numTries < maxtry) {
              embedding = await createEmbedding(description);
              numTries++;
            }
          } else {
            embedding = [];
          }
          if (embedding.length != 0) {
            let matches = [];
            const results = await queryPineCone(
              embedding,
              500,
              tempPost._id.toString()
            );
            if (results.length == 0) {
              matches = [];
            } else {
              const resultIds: string[] = [];

              results.forEach((val) => {
                if (val.score! < pSimilarity) return;
                resultIds.push(val.metadata.id);
              });
              const postIds = resultIds!.map(
                (val: any) => new Types.ObjectId(val)
              );
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
                ],
              ];
              pipeline = [
                ...pipeline,
                ...[
                  {
                    $lookup: {
                      from: "previews",
                      let: { preview: "$preview" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$_id", "$$preview"],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: 1,
                            url: 1,
                            siteName: 1,
                            image: 1,
                            title: 1,
                            description: 1,
                          },
                        },
                      ],
                      as: "preview",
                    },
                  },
                  {
                    $unwind: {
                      path: "$preview",
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
            }
            res.send({ result: matches, origin: tempPost });
            return;
          } else {
            res.send({ result: [], message: "There was some error." });
            return;
          }
        } else {
          res.send({ result: [], message: "Post not exist." });
        }
      } else {
        res.send({ result: [], message: "Pinecone init error" });
      }
    } catch (error) {
      res.send({ result: [], message: error });
    }
  });
};
