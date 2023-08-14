import { PineconeClient } from "@pinecone-database/pinecone";
import { VectorOperationsApi } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch";
import dotenv from "dotenv";

dotenv.config();

let pineIndex: VectorOperationsApi;

export const initPineCone = async () => {
  try {
    const pinecone = new PineconeClient();
    await pinecone.init({
      environment: process.env.PINECONE_ENV || "",
      apiKey: process.env.PINECONE_API_KEY || "",
    });

    pineIndex = pinecone.Index(process.env.PINECONE_INDEX || "");
    return true;
  } catch (error) {
    return false;
  }
};

export const upsertPineCone = async (vectors: any[]) => {
  const upsertRequest = {
    vectors: vectors,
    namespace: process.env.PINECONE_NAMESPACE || "",
  };
  try {
    await pineIndex.upsert({ upsertRequest });
    return true;
  } catch (error) {
    return false;
  }
};

export const upsertSimilarPineCone = async (vectors: any[]) => {
  const upsertRequest = {
    vectors: vectors,
    namespace: process.env.PINECONE_SIMILAR_NAMESPACE || "",
  };
  try {
    await pineIndex.upsert({ upsertRequest });
    return true;
  } catch (error) {
    return false;
  }
};

export const deletePineCone = async (deleteids: string[]) => {
  try {
    const rlt = await pineIndex.delete1({
      ids: deleteids,
      namespace: process.env.PINECONE_NAMESPACE || "",
    });
    return true;
  } catch (error) {
    return false;
  }
};

export const deleteSimilarPineCone = async (deleteids: string[]) => {
  try {
    console.log("deleteSimilarPineCone");
    await pineIndex.delete1({
      ids: deleteids,
      namespace: process.env.PINECONE_SIMILAR_NAMESPACE || "",
    });
    return true;
  } catch (error) {
    return false;
  }
};

export const queryPineCone = async (
  embedding: number[],
  topK: number,
  post_id: string
) => {
  let results: any[] = [];
  const queryRequest = {
    vector: embedding,
    topK: topK,
    filter: { id: { $ne: post_id } },
    includeMetadata: true,
    includeValues: false,
    namespace: process.env.PINECONE_NAMESPACE || "",
  };
  try {
    const queryResponse = await pineIndex.query({ queryRequest });
    results = queryResponse.matches!;
  } catch (error) {
    console.log(error);
    results = [];
  }
  return results;
};
