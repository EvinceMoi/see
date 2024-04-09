import { video_info_t } from '@utils/common.ts';
import { cheerio } from 'cheerio';

const BASE_URL = 'www.freeok.pro';

const get_headers = (referer: string) => {
  return {
    'authority': BASE_URL,
    'accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.7',
    'cache-control': 'max-age=0',
    'referer': referer,
    'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Brave";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'sec-gpc': '1',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };
};

const fetch_html = async (url: string, headers: {[key: string]: string}): Promise<string> => {
  const resp = await fetch(url, {
    headers,
  });
  return resp.text();
};

export interface playlist_item_t {
  title: string; // show title
  name: string; // episode name
  url: string; // episode page url
  referer: string;
}

export const get_playlist = async (id: string): Promise<playlist_item_t[]> => {
  const url = `https://${BASE_URL}/vod-detail/${id}.html`;
  const html = await fetch_html(url, get_headers(`https://${BASE_URL}`));

  const $ = cheerio.load(html);
  const title = $('h1').text();
  console.log('title:', title);
  const playlist = $('div.module-list:first').find('a.module-play-list-link');
  console.log('episodes:', playlist.length);
  const pl = playlist.map((idx, el) => {
    return {
      title,
      name: $(el).find('span').text(),
      // url: [`https://${BASE_URL}`, el.attribs['href']].join('/'),
      url: `https://${BASE_URL}/xplay/${id}-1-${idx + 1}.html`,
      referer: url
    };
  }).get();

  return pl;
};

export const get_play_url = async (ep: playlist_item_t): Promise<video_info_t> => {
  const html = await fetch_html(ep.url, get_headers(ep.referer));
  const $ = cheerio.load(html);
  const script = $('div.player-box-main > script:first').text().trim();
  const matches = script.match(/var player.+=\s*(.+)/);
  console.log('matched:', matches);
  let vu: string | undefined = undefined;
  if (matches) {
    const d = JSON.parse(matches[1]);
    console.log(JSON.stringify(d));
    vu = decodeURIComponent(d.url);
  }

  return {
    title: ep.title,
    video: vu,
  }
};

