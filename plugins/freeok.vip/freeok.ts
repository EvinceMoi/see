import { video_info_t, PC_USER_AGENT } from "@utils/common.ts";
import { cheerio } from 'cheerio';
import puppeteer, { Page, } from 'puppeteer';

const BASE_URL = 'https://www.freeok.pro';

const fetch_html = async (url: string): Promise<string> => {
  const resp = await fetch(url, {
    headers: {
      ...PC_USER_AGENT,
    }
  });
  return resp.text();
}

export interface playlist_item_t {
  title: string, // show title
  name: string, // episode name
  url: string, // episode page url
}

export const get_playlist = async (id: string): Promise<playlist_item_t[]> => {
  const url = `${BASE_URL}/vod-detail/${id}.html`;
  const html = await fetch_html(url);

  const $ = cheerio.load(html);
  const title = $('h1').text();
  console.log('title:', title);
  const playlist = $('div.module-list:first').find('a.module-play-list-link');
  console.log('episodes:', playlist.length);
  const pl = playlist.map((_, el) => {
    return {
      title,
      name: $(el).find('span').text(),
      url: [BASE_URL, el.attribs['href']].join('/'),
    }
  }).get();

  return pl;
}

export const get_play_url = async (page: Page, ep: playlist_item_t): Promise<video_info_t> => {
  await page.goto(ep.url);

  const selector = `#playleft > iframe`;
  await page.waitForSelector(selector);
  const iframe = await page.$(selector)!;
  if (!iframe) throw new Error('iframe not found');

  const src = await iframe.evaluate(el => el.getAttribute('src'));
  const url = new URL(src, BASE_URL);
  const play_url = url.searchParams.get('url');
  if (!play_url) throw new Error('video url not found');

  return {
    title: ep.title + '|' + ep.name,
    video: play_url,
  }
};