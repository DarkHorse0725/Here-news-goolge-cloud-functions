import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import * as cheerio from "cheerio";
import { convert } from "html-to-text";
import { Scrapper } from "./models";
import axios, { AxiosRequestConfig } from 'axios';
dotenv.config();
mongoose.set("strictQuery", false);

const options = {
  wordwrap: 130,
  selectors: [
    { selector: "div", format: "skip" },
    { selector: "img", format: "skip" },
    { selector: "span", format: "skip" },
    { selector: "button", format: "skip" },
    { selector: "picture", format: "skip" },
    { selector: "aside", format: "skip" },
    { selector: "ul", format: "skip" },
    { selector: "style", format: "skip" },
  ],
};

const optionsForWeixin = {
  wordwrap: 130,
  selectors: [
    { selector: "div", format: "skip" },
    { selector: "img", format: "skip" },
  ],
};

const optionsForBloomberg = {
  wordwrap: 130,
  selectors: [
    { selector: "div", format: "skip" },
    { selector: "a", format: "skip" },
    { selector: "img", format: "skip" },
  ],
};

const optionsForCNBC = {
  wordwrap: 130,
  selectors: [
    { selector: "img", format: "skip" },
    { selector: "span", format: "skip" },
    { selector: "button", format: "skip" },
    { selector: "picture", format: "skip" },
    { selector: "aside", format: "skip" },
    { selector: "style", format: "skip" },
  ],
}

const optionsForPD = {
  wordwrap: 130,
  selectors: [
    { selector: "div", format: "skip" },
    { selector: "img", format: "skip" },
    { selector: "span", format: "skip" },
    { selector: "button", format: "skip" },
    { selector: "picture", format: "skip" },
    { selector: "aside", format: "skip" },
    { selector: "style", format: "skip" },
  ],
}

const optionsDevto = {
  wordwrap: 130,
  selectors: [
    { selector: "img", format: "skip" },
    { selector: "span", format: "skip" },
    { selector: "button", format: "skip" },
    { selector: "picture", format: "skip" },
    { selector: "aside", format: "skip" },
    { selector: "style", format: "skip" },
  ],
};

const optionsArchiveToday = {
  wordwrap: 130,
  selectors: [
    { selector: "img", format: "skip" },
    { selector: "span", format: "skip" },
    { selector: "button", format: "skip" },
    { selector: "picture", format: "skip" },
    { selector: "aside", format: "skip" },
    { selector: "style", format: "skip" },
  ],
};

const optionsMingpao = {
  wordwrap: 130,
  selectors: [
    { selector: "img", format: "skip" },
    { selector: "span", format: "skip" },
    { selector: "button", format: "skip" },
    { selector: "picture", format: "skip" },
    { selector: "aside", format: "skip" },
    { selector: "style", format: "skip" },
    { selector: "a", format: "skip" },
  ],
};

const optionsTomshard = {
  wordwrap: 130,
  selectors: [
    { selector: "div", format: "skip" },
    { selector: "a", format: "skip" },
    { selector: "img", format: "skip" },
    { selector: "span", format: "skip" },
    { selector: "button", format: "skip" },
    { selector: "picture", format: "skip" },
    { selector: "aside", format: "skip" },
    { selector: "ul", format: "skip" },
    { selector: "style", format: "skip" },
    { selector: "script", format: "skip" },
  ],
};

const scrappingWeixin = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const main_content = $("#js_content");
  const title = $("#activity-name").text().replace(/\r?\n|\r/g, '').trim();

  const publishDate = $("#publish_time").text();
  const contentArray: string[] = [];
  let children = main_content.first().children(":not(h1)"); // Select all non-h1 children

  for (let i = 0; i < children.length; i++) {
    let temp = $(children[i]).html();
    if (temp) {
      let _contentTemp = convert(temp, optionsForWeixin).replace(/\r?\n|\r/g, '').trim();

      if (_contentTemp.indexOf("References:") != -1) {
        break;
      }
      if(_contentTemp.length) contentArray.push(_contentTemp);
    }
  }

  return res.send({
    status: "success",
    title: title,
    publishDate,
    article: contentArray,
  });
}

const scrappingBloomberg = async (site_url: string, res: any) => {
  const headers: AxiosRequestConfig = {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
      "Accept-Language": "*"
    }
  };
  const page = await axios.get(site_url, headers)
  let $ = cheerio.load(page.data || "");
  const main_content = $("main");

  const tempMain = cheerio.load(main_content.html() || "");
  const title = tempMain("h1").text();
  const createdDate = tempMain("time").text();

  const _content = tempMain("p");
  const contentArray: string[] = [];
  const author = $('[class*="Byline_author"]').text()

  _content.each((_, elem) => {
    const temp = tempMain(elem).html();
    if (temp) {
      const htmlTemp = convert(temp, optionsForBloomberg).replace(/\r?\n|\r/g, '').trim();
      if (htmlTemp.length > 0) {
        contentArray.push(htmlTemp);
      }
    }
  });

  return res.send({
    status: "success",
    title,
    createdDate: createdDate,
    article: contentArray,
    author
  });
}

const scrappingWsj = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const content = $("figcaption").text().replace(/\r?\n|\r/g, '').trim()
        
  const description = $('[data-type="paragraph"]').text().replace(/\r?\n|\r/g, '').trim()

  const title = $('h1:first').text()

  const authorFuzzy = $('[class*="AuthorLink"]').children().children().text()
  const author = authorFuzzy.substring(authorFuzzy.indexOf("}") + 1, authorFuzzy.length)
  
  const updateDate = $('[class*="TimeTag"]').first().text().replace("Updated ", "")

  return res.send({
    content: [content, description],
    title,
    author,
    updateDate,
    status: "success"
  })
}

const scrappingBBC = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const main_content = $("main");
  const title = $("h1").text().replace(/\r?\n|\r/g, '').trim();
  const createdDate = $("time:first").text();
  const bbb = main_content.html();

  const article = cheerio.load(bbb || "");
  const _content = article("p");
  const contentArray: string[] = [];

  const author = $('[class*="TextContributorName"]').text().replace("By", "").replace(/\r?\n|\r/g, '').trim();
  _content.each((_, elem) => {
    const temp = article(elem).html();
    if (temp) {
      const htmlTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();
      if (htmlTemp.length > 0) {
        contentArray.push(htmlTemp);
      }
    }
  });

  return res.send({
    status: "success",
    title,
    createdDate,
    article: contentArray,
    author
  });
}

const scrappingCBSNEWS = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);
  
  const title = $("[class*='content__title']").text().replace(/\r?\n|\r/g, '').trim();
  const author = $("[class*='content__meta--byline']").text().replace("By", "").replace(/\r?\n|\r/g, '').trim();
  const publishedDate = $("time:first").attr('datetime')?.toString();
  const children = $("[class*='content__body']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    author,
    publishedDate,
    content: contentArray
  })
}

const scrappingCNN = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("[class*='headline__text']").text().replace(/\r?\n|\r/g, '').trim();
  const author = $("[class='byline__name']").text().replace(/\r?\n|\r/g, '').trim();
  const publishedDate = $("[class='timestamp']").text().replace("Published", "").replace(/\r?\n|\r/g, '').trim();
  
  const children = $("[class*='article__content']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: 'success',
    title,
    author,
    publishedDate,
    content: contentArray
  })
}

const scrappingWeiduNews = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("[class*='title']").text().replace(/\r?\n|\r/g, '').trim();
  const time = $("[class*='time']").first().text().replace(/\r?\n|\r/g, '').trim();
  
  const children = $("[class*='content']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const elementText = $(children[i]).text().replace(/\r?\n|\r/g, '').trim();

    if(elementText.length) contentArray.push(elementText)
  }
  
  return res.send({
    status: "success",
    title,
    createdAt: time,
    content: contentArray
  })
}

const scrappingApNews = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("[class*='Page-headline']").text().replace(/\r?\n|\r/g, '').trim();
  const children = $("[class*='RichTextBody']").children();
  const publishedTime = $('meta[property="article:published_time"]').attr('content')?.toString();
  const modifiedTime = $('meta[property="article:modified_time"]').attr('content')?.toString();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: 'success',
    title,
    content: contentArray,
    publishedTime,
    modifiedTime
  })
}

const scrappingFoxNews = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("[class='headline']").text().replace(/\r?\n|\r/g, '').trim();
  const publishedDate = $("[class='article-date']").text().replace("Published", "").replace(/\r?\n|\r/g, '').trim();
  const autorSection = $("[class='author-byline']")
  const authorTag$ = cheerio.load(autorSection.html() || "");

  const author = authorTag$('a:first').text().replace(/\r?\n|\r/g, '').trim();

  const children = $("[class*='article-body']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: 'success',
    title,
    author,
    publishedDate,
    content: contentArray
  })
}

const scrappingMattersNews = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const titleSection = $("[class*='styles_title']").first()
  const title$ = cheerio.load(titleSection.html() || "")
  const title = title$('h1:first').text().replace(/\r?\n|\r/g, '').trim()

  const createdAt = $("time:first").attr('datetime')?.toString()
  const author = $("[class*='styles_name']").first().text().replace(/\r?\n|\r/g, '').trim()
  const summary = $("[data-test-id='article/summary']").text().replace(/\r?\n|\r/g, '').trim()
  const children = $("[data-test-id='article/content']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    author,
    createdAt,
    summary,
    content: contentArray
  })
}

const scrappingCNBC = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("[class='ArticleHeader-headline']").text().replace(/\r?\n|\r/g, '').trim()
  const publishedDate = $("[data-testid='published-timestamp']").attr('datetime')?.toString()
  const updatedDate = $("[data-testid='lastpublished-timestamp']").attr('datetime')?.toString()
  
  const children = $("[class*='ArticleBody-articleBody']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsForCNBC.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: 'success',
    title,
    publishedDate,
    updatedDate,
    content: contentArray
  })
}

const scrappingPDNews = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("#newsTitle").text().replace(/\r?\n|\r/g, '').trim()
  const publishedDate = $("[class*='news-publish-time']").text().replace(/\r?\n|\r/g, '').trim()
  const author = $("main").attr('data-author-name')?.toString()

  const children = $("#newContent").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsForPD.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: 'success',
    title,
    publishedDate,
    content: contentArray,
    author
  })
}

const scrappingNewsWeek = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const titleSection = $("#header-article")
  const title$ = cheerio.load(titleSection.html() || "")
  const title = title$('[class*="title"]').text().replace(/\r?\n|\r/g, '').trim()

  const createdAt = $("time:first").text().replace("On", "").replace("at ", "").replace(/\r?\n|\r/g, '').trim()
  const author = $('[class*="author"]').first().text().replace(/\r?\n|\r/g, '').trim()

  const children = $("[class*='article-body']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    createdAt,
    author,
    content: contentArray
  })
}

const scrappingUSAToday = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("h1:first").text().replace(/\r?\n|\r/g, '').trim();
  const datetime = $("[class='gnt_ar_dt']").attr('aria-label')?.toString();

  const publishedDate = datetime?.slice(datetime?.indexOf("Published") + 10, datetime.indexOf('Updated')).replace(/\r?\n|\r/g, '').trim();
  const updatedDate = datetime?.slice(datetime?.indexOf("Updated") + 8, datetime.length).replace(/\r?\n|\r/g, '').trim();
  
  const authorSection = $("[class='gnt_ar_by']")
  const author$ = cheerio.load(authorSection.html() || "")
  const author = author$('a:first').text().replace(/\r?\n|\r/g, '').trim()
  
  const children = $("[class='gnt_ar_b']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    publishedDate,
    updatedDate,
    author,
    content: contentArray
  })
}

const scrapppingHongKongFP = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $("h1:first").text().replace(/\r?\n|\r/g, '').trim();
  const author = $("[class*='byline']").text().replace("by", "").replace(/\r?\n|\r/g, '').trim();
  const publishedTime = $('meta[property="article:published_time"]').attr('content')?.toString();
  const modifiedTime = $('meta[property="article:modified_time"]').attr('content')?.toString();
  
  const children = $("[class='entry-content']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = options.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    author,
    publishedTime,
    modifiedTime,
    content: contentArray
  })
}

const scrappingWashingtonPost = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const publishedTime = $('meta[property="article:published_time"]').attr('content')?.toString();
  const modifiedTime = $('meta[property="article:modified_time"]').attr('content')?.toString();
  const title = $('meta[property="og:title"]').attr('content')?.toString();

  const author = $("[data-qa*='author-name']").text().replace(/\r?\n|\r/g, '').trim();

  const articleMain = $("article:first")

  const article$ = cheerio.load(articleMain.html() || "")
  const articles = article$('[class*="article-body"]').children()

  const contentArray: string[] = [];

  for (let i = 0; i < articles.length; i++) {
    const elementText = $(articles[i]).text().replace(/\r?\n|\r/g, '').trim();
    if (elementText.length) contentArray.push(elementText);
  }

  return res.send({
    status: "success",
    publishedTime,
    modifiedTime,
    title,
    author,
    content: contentArray
  })
}

const scrappingDevTo = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const headerMain = $("[class*='article__header__meta']")
  const header$ = cheerio.load(headerMain.html() || "")
  const author = header$('a').eq(1).text();

  const postedDate = header$('time:first').text().replace(/\r?\n|\r/g, '').trim();
  const title = header$('h1:first').text().replace(/\r?\n|\r/g, '').trim();

  const children = $("#article-body").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsDevto.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, options).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    postedDate,
    content: contentArray,
    title,
    author
  })
}

const scrappingArchivePh = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $('meta[property="og:title"]').attr('content')?.toString();
  const publishedTime = $('meta[property="article:published_time"]').attr('content')?.toString();
  const modifiedTime = $('meta[property="article:modified_time"]').attr('content')?.toString();
  const author = $('[itemprop="name"]').text().replace(/\r?\n|\r/g, '').trim();

  const children = $("[name='articleBody']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsArchiveToday.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, optionsArchiveToday).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }


  return res.send({
    status: 'success',
    title,
    publishedTime,
    modifiedTime,
    author,
    content: contentArray
  })
}

const scrappingMinpao = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $('meta[property="og:title"]').attr('content')?.toString();
  const publishedDate = $('[itemprop="datePublished"]').text().replace(/\r?\n|\r/g, '').trim();

  const children = $("article").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsMingpao.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, optionsMingpao).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: 'success',
    title,
    publishedDate,
    content: contentArray
  })
}

const scrappingPolitico = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $('meta[property="og:title"]').attr('content')?.toString();
  const author = $('[class="story-meta__authors"]').text().replace(/\r?\n|\r/g, '').trim();
  const createdTime = $('[class="story-meta__timestamp"]').text().replace(/\r?\n|\r/g, '').trim();

  const contentArray = $('[class="story-text"]').map((_, element) => {
    return $(element).text().replace(/\r?\n|\r/g, '').trim();
  }).get()

  return res.send({
    status: "success",
    title,
    author,
    createdTime,
    content: contentArray
  })
}

const scrappingTomshardware = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $('h1:first').text().replace(/\r?\n|\r/g, '').trim();
  const publishedDate = $('meta[property="article:published_time"]').attr('content')?.toString();
  const modifiedDate = $('meta[property="article:modified_time"]').attr('content')?.toString();
  const author = $('[class="author-byline__author-name"]').text().replace(/\r?\n|\r/g, '').trim();

  const children = $("#article-body").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsTomshard.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, optionsTomshard).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    publishedDate,
    modifiedDate,
    author,
    content: contentArray
  })
}

const scrappingTheHackerNews = async (site_url: string, res: any) => {
  const optionsTheHackerNews = {
    wordwrap: 130,
    selectors: [
      { selector: "div", format: "skip" },
      { selector: "a", format: "skip" },
      { selector: "img", format: "skip" },
      { selector: "span", format: "skip" },
      { selector: "button", format: "skip" },
      { selector: "picture", format: "skip" },
      { selector: "aside", format: "skip" },
      { selector: "style", format: "skip" },
      { selector: "script", format: "skip" },
    ],
  };

  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $('[class="story-title"]').text().replace(/\r?\n|\r/g, '').trim();
  const authorInfo = $('[class="author"]')

  const publishedDate = $(authorInfo[0]).text().replace(/\r?\n|\r/g, '').trim();
  const author = $(authorInfo[1]).text().replace(/\r?\n|\r/g, '').trim();

  const children = $("#articlebody").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsTheHackerNews.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, optionsTheHackerNews).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    publishedDate,
    author,
    content: contentArray
  })
}

const scrappingGizmodo = async (site_url: string, res: any) => {
  const optionsGizmodo = {
    wordwrap: 130,
    selectors: [
      { selector: "a", format: "skip" },
      { selector: "img", format: "skip" },
      { selector: "span", format: "skip" },
      { selector: "button", format: "skip" },
      { selector: "picture", format: "skip" },
      { selector: "aside", format: "skip" },
      { selector: "style", format: "skip" },
      { selector: "script", format: "skip" },
      { selector: "figure", format: "skip" },
    ],
  };

  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $('meta[property="og:title"]').attr('content')?.toString();
  const author = $('meta[name="author"]').attr('content')?.toString();
  const publishedDate = $('time:first').attr('datetime')?.toString();

  const children = $("[class*='js_post-content']").children();

  const contentArray: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const element = $(children[i]);
    const tagName = element.prop("tagName").toLowerCase();
    const skipElement = optionsGizmodo.selectors.some(item => item.selector === tagName && item.format === "skip");

    if (!skipElement) {
      let temp = element.html();
      if (temp) {
        let _contentTemp = convert(temp, optionsGizmodo).replace(/\r?\n|\r/g, '').trim();

        if (_contentTemp.length) contentArray.push(_contentTemp);
      }
    }
  }

  return res.send({
    status: "success",
    title,
    author,
    publishedDate,
    content: contentArray
  })
}

const scrappingEconomist = async (site_url: string, res: any) => {
  const response = await axios.get(site_url);
  let $ = cheerio.load(response.data);

  const title = $('meta[property="og:title"]').attr('content')?.toString();
  const publishedDate = $('time:first').attr('datetime')?.toString();

  const contentArray = $('[class*="article__body-text"]').map((_, element) => {
    return $(element).text().replace(/\r?\n|\r/g, '').trim();
  }).get()

  return res.send({
    status: "success",
    title,
    publishedDate,
    content: contentArray
  })
}

interface ScrappingFunction {
  (site_url: string, res: any): void;
}

const DomainScrappingMapper: { [domain: string]: ScrappingFunction } = {  
  "mp.weixin.qq.com": scrappingWeixin,
  "bloomberg.com": scrappingBloomberg,
  "wsj.com": scrappingWsj,
  "bbc.com": scrappingBBC,
  "cbsnews.com": scrappingCBSNEWS,
  "cnn.com" : scrappingCNN,
  "weidunews.com" : scrappingWeiduNews,
  "apnews.com": scrappingApNews,
  "foxnews.com": scrappingFoxNews,
  "matters.news": scrappingMattersNews,
  "cnbc.com": scrappingCNBC,
  "peoplesdaily.pdnews.cn": scrappingPDNews,
  "newsweek.com": scrappingNewsWeek,
  "usatoday.com": scrappingUSAToday,
  "hongkongfp.com": scrapppingHongKongFP,
  "washingtonpost.com": scrappingWashingtonPost,
  "dev.to": scrappingDevTo,
  "archive.ph": scrappingArchivePh,
  "news.mingpao.com": scrappingMinpao,
  "politico.com": scrappingPolitico,
  "tomshardware.com": scrappingTomshardware,
  "thehackernews.com": scrappingTheHackerNews,
  "gizmodo.com": scrappingGizmodo,
  "economist.com": scrappingEconomist
}

export const scrappingURL: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const { site_url } = req.body;

    const MONGO_URL = process.env.MONGO_DB_URL || "";
    await mongoose.connect(MONGO_URL);

    let domain = new URL(site_url);
    let _domain = domain.hostname.replace("www.", "");

    const scrapperDomain = await Scrapper.findOne({
      $and: [
        {
          domain: { $regex: _domain },
        },
        {
          halt: false,
        },
      ],
    });

    if (scrapperDomain && DomainScrappingMapper.hasOwnProperty(scrapperDomain.domain)) {
      return DomainScrappingMapper[scrapperDomain.domain](site_url, res);
    } else {
      return res.send({
        status: "warning",
        message: "wrong url",
      });
    }
  });
};
