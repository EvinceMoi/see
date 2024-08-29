// deno-lint-ignore-file no-explicit-any
import * as cheerio from 'cheerio';
import { PC_USER_AGENT, video_info_t, abortable_fetch } from '@utils/common.ts';

const selectors = {
  playlist_contianer: '.wp-playlist-tracks',
  playlist_item: '.wp-playlist-item',
  playlist_playing: 'wp-playlist-playing',

  video_play_button: '.vjs-big-play-button',
  video: '#vjsp_html5_api',
  source_script: 'script.wp-playlist-script',
};

const get_headers = (referer: string) => {
  const host = new URL(referer).hostname;
  return {
    'authority': host,
    // 'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.8',
    'referer': referer + '/',
    'sec-ch-ua': 'Not/A)Brand";v="8", "Chromium";v="126", "Microsoft Edge";v="126"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'user-agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  };
};

const fetch_html = async (url: string): Promise<string> => {
  const u = new URL(url);
  console.log(u.origin + u.pathname);
  const resp = await abortable_fetch(url, {
    // headers: { ...PC_USER_AGENT, },
    headers: get_headers(u.origin + u.pathname),
  });
  return resp.text();
};

interface playlist_item_t {
  caption: string;
  referer: string;
  src0: string;
  src1: string;
  src2: string;
  src3: string;
}

export const get_playlist = async (uri: string): Promise<playlist_item_t[]> => {
  const html = await fetch_html(uri);
  const $ = cheerio.load(html);
  const sjson = $(selectors.source_script).text();
  if (!sjson)
    throw new Error('cannot find source script in html');
  const source = JSON.parse(sjson);
  const tracks = source.tracks.map(track => {
    const { caption, src0, src1, src2, src3 } = track;
    return {
      caption, src0, src1, src2, src3, referer: uri
    };
  });
  return tracks;
}

export const get_video_info = async (ep: playlist_item_t, domain: string): Promise<video_info_t> => {
  const title = ep.caption;
  let src: string | undefined = undefined;

  if (ep.src1) {
    const api = `https://${domain}/getvddr2/video?id=${ep.src1}&type=json`;
    const resp = await abortable_fetch(api, {
      headers: get_headers(ep.referer)
    });
    const res = await resp.json();
    src = res.url;
  } else if (ep.src0) {
    src = `https://v.${domain}${ep.src0}`;
  } else if (ep.src2) {
    console.log('==== src2:', ep.src2);
  } else if (ep.src3) {
    console.log('==== src3:', ep.src3);
  }

  return {
    title,
    video: src
  }
}

