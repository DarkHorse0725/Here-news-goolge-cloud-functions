import {
  Configuration,
  ChatCompletionRequestMessageRoleEnum,
  OpenAIApi,
} from "openai";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const createEmbedding = async (input: string): Promise<number[]> => {
  try {
    const inputs = String(input).replace(/\n/g, " ");
    const embeddingResponse = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: inputs,
    });
    const [{ embedding }] = embeddingResponse.data.data;
    return embedding;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const generateSummary = async (description: string): Promise<string> => {
  const metadescription = `Please give me summary about story. If you can't generate correct summary, just reply only with '='. This is the story: \n${description.replace(
    /(\r\n|\n|\r)/gm,
    ""
  )}`;
  let totalValue;
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Let's collaborate to generate accurate summary from stories`,
        },
        { role: "user", content: metadescription },
      ],
    });
    totalValue = response.data.choices[0].message!.content!.toString();
  } catch (error) {
    totalValue = "";
    console.log(error);
  }
  return totalValue;
};

export const generateTitle = async (description: string): Promise<string> => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const metadescription = `Title Generation Prompt: Based on the content of this post, please generate a concise and compelling 10-word title in the original language . If you can't generate correct summary or it is random text or it is not a story, just reply only '=' without any words. This is the story: \n${description.replace(
    /(\r\n|\n|\r)/gm,
    ""
  )}`;
  let totalValue;
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Let's collaborate to generate accurate summary from stories`,
        },
        { role: "user", content: metadescription },
      ],
    });
    totalValue = response.data.choices[0].message!.content!.toString();
    if (totalValue.indexOf("Title: ") > -1) {
      totalValue = totalValue.substring(
        totalValue.indexOf("Title: ") + 7,
        totalValue.length
      );
    }
  } catch (error) {
    totalValue = (error as any).message;
    console.log(error);
  }
  return totalValue;
};

export const translateText = async (
  translateObj?: any,
  langCode?: string
): Promise<any> => {
  let result = "";
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",

      messages: [
        {
          role: "system",
          content: `Use OpenAI language model to translate the text to the target language`,
        },
        {
          role: "user",
          content: `Translate the following into ${langCode}. Keep the object shape and keys intact and without removing any characters, make it JSON parsable. \n\n${JSON.stringify(
            translateObj
          )}`,
        },
      ],
    });
    // console.log("Response -> ", response);
    result = response.data.choices[0].message!.content;
  } catch (error) {
    console.log("translateText", error);
  }
  return result;
};

async function createBufferFromURL(imageURL: string) {
  try {
    const response = await axios.get(imageURL, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    return buffer;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Usage example
const imageURL =
  "https://storage.googleapis.com/staging-news/avatars/avatar_1.jpg";

export const generateUserAvatar = async (): Promise<string[]> => {
  // const response = await openai.createImage({
  //   prompt: "funny anime random user avatar",
  //   n: 10,
  //   size: "512x512",
  // });
  createBufferFromURL(imageURL)
    .then(async (buffer: Buffer) => {
      // Cast the buffer to `any` so that we can set the `name` property
      const file: any = buffer;
      // Set a `name` that ends with .png so that the API knows it's a PNG image

      file.name = "image.png";
      console.log(file);
      const response = await openai.createImageVariation(file, 1, "1024x1024");
      console.log(response);
    })
    .catch((error) => {
      // Handle any errors that occur
      console.error(error);
    });
  // const buffer = await createBufferFromURL(imageURL);
  // const file: any = buffer;
  // file.name = "image.png";
  // const response = await openai.createImageVariation(
  //   file,
  //   10,
  //   "512x512"
  // );
  const image_url: string[] = [];
  // response.data.data.map(val => image_url.push(val.url!));
  return image_url;
};

export const generateTags = async (description: string): Promise<any> => {
  const metadescription = `what are some relevant max 10 tags related to the story, in English?.
    I need Json format response with language code key. For example {"en": ["protest", "China", "democracy"]}.
    I need only "en" key value.
    This is the story:`;
  let tempjson: any = {};
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Let's collaborate to generate accurate topics from stories`,
        },
        {
          role: "user",
          content: `${metadescription}\n\n"Protest for democracy in China" (抗议中国的民主)`,
        },
        {
          role: "assistant",
          content: `{"en": ["protest", "China", "democracy"], "zh":["抗议", "中国", "民主"]}`,
        },
        {
          role: "user",
          content: `${metadescription}\n\nProtest for democracy in China`,
        },
        {
          role: "assistant",
          content: `{"en": ["protest", "China", "democracy"]}`,
        },
        {
          role: "user",
          content: `${metadescription}\n\n${description.replace(
            /(\r\n|\n|\r)/gm,
            ""
          )}`,
        },
      ],
    });
    tempjson = JSON.parse(
      response.data.choices[0].message!.content!.toString()
    );
  } catch (error) {
    console.log(error);
  }
  return tempjson;
};

export const detectLanguageCodes = async (
  description: string
): Promise<any> => {
  const metadescription = `Which languages contain from the follow string?If you can't, please return English code I need language code's array. For example ['en', 'zh', 'it'].
    This is the string:`;
  let tempjson = "";
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a language detection assistant.`,
        },
        {
          role: "user",
          content: `${metadescription}\n\n 抗议中国的民主)`,
        },
        { role: "assistant", content: `zh` },
        {
          role: "user",
          content: `${metadescription}\n\nProtest for democracy in China`,
        },
        { role: "assistant", content: `en` },
        {
          role: "user",
          content: `${metadescription}\n\n${description.replace(
            /(\r\n|\n|\r)/gm,
            ""
          )}`,
        },
      ],
    });
    // console.log(
    //   "Response detectLanguageCodes => ",
    //   response.data.choices[0].message!.content!.toString()
    // );
    tempjson = response.data.choices[0].message!.content;
  } catch (error) {
    console.log(error);
  }
  return tempjson;
};
