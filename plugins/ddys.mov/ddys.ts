// deno-lint-ignore-file no-explicit-any
import puppeteer, { Page, ElementHandle } from 'puppeteer';
import { video_info_t } from '@utils/common.ts';

const selectors = {
  playlist_contianer: '.wp-playlist-tracks',
  playlist_item: '.wp-playlist-item',
  playlist_playing: 'wp-playlist-playing',

  video_play_button: '.vjs-big-play-button',
  video: '#vjsp_html5_api',
};

export const open_page = async (url: string): Promise<Page> => {
  const browser = await puppeteer.launch({
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    args: ["--headless=new"],
  });
  const page = await browser.newPage();
  // bypass cloudflare challenge, see `https://stackoverflow.com/a/71929124`
  await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0');
  await page.setViewport({ width: 1920, height: 1080 }); 
  await page.goto(url);
  await page.waitForSelector('.site-title')
  return page;
};

interface playlist_item_t {
  caption: string;
  selected: boolean;
  el?: ElementHandle<any>;
}
export const get_playlist = async (page: Page, with_element = false) => {
  await page.waitForSelector(selectors.playlist_contianer); // wait for playlist
  const playlist_items = await page.$$(selectors.playlist_item);
  const playlist = await Promise.all(playlist_items.map(async it => {
    const div_class: string = await it.evaluate(el => el.getAttribute('class'));
    const selected = div_class.includes(selectors.playlist_playing);

    let text: string = await it.evaluate(el => el.textContent);
    text = text.replace(/[\n\t]+/g, '');
    const ret: playlist_item_t = {
      caption: text,
      selected,
    };
    if (with_element) {
      ret.el = it;
    }
    return ret;
  }));

  return playlist;
};

export const get_video_info = async (page: Page, playlist_idx: number): Promise<video_info_t> => {
  const playlist = await get_playlist(page, true);
  if (playlist_idx >= playlist.length) throw new Error(`no such index: ${playlist_idx}`);

  const episode = playlist[playlist_idx];
  await episode.el!.click();

  // await el.click();
  console.log('playing episode:', episode.caption);

  // click play button
  const pp_selector = '.vjs-icon-placeholder';
  await page.waitForSelector(pp_selector);

  const el_play = await page.waitForSelector(selectors.video_play_button);
  if (!el_play) throw new Error('no play button found');
  await el_play.click();

  // wait for <video> has src attribute
  const el_video = await page.waitForSelector(selectors.video);
  if (!el_video) throw new Error('video tag not found');
  const vp = selectors.video;
  await page.waitForFunction(vp => {
    const el = document.querySelector(vp);
    const src = el?.getAttribute('src');
    return !!src;
  }, {
    timeout: 60 * 1000
  }, vp);
  const src = await el_video.evaluate(el => el.getAttribute("src"));
  console.log('episode', episode.caption, 'play url:', src);
  await el_video.click(); // pause video
  return {
    title: episode.caption,
    video: src,
  }
};