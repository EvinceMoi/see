// deno-lint-ignore-file no-explicit-any
// import puppeteer, { ElementHandle, Page } from 'puppeteer';
import { cheerio } from 'cheerio';
import { PC_USER_AGENT, video_info_t } from '@utils/common.ts';

const selectors = {
  playlist_contianer: '.wp-playlist-tracks',
  playlist_item: '.wp-playlist-item',
  playlist_playing: 'wp-playlist-playing',

  video_play_button: '.vjs-big-play-button',
  video: '#vjsp_html5_api',
  source_script: 'script.wp-playlist-script',
};

const fetch_html = async (url: string): Promise<string> => {
  const resp = await fetch(url, {
    headers: {
      ...PC_USER_AGENT,
    },
  });
  return resp.text();
};

interface playlist_item_t {
  caption: string;
  src0: string;
  src1: string;
  src2: string;
  src3: string;
}

export const get_playlist = async (uri: string): Promise<playlist_item_t[]> => {
  const html = await fetch_html(uri);
  const $ = cheerio.load(html);
  const sjson = $(selectors.source_script).text();
  const source = JSON.parse(sjson);
  const tracks = source.tracks.map(track => {
    const { caption, src0, src1, src2, src3 } = track;
    return {
      caption, src0, src1, src2, src3
    };
  });
  return tracks;
}

export const get_video_info = async (ep: playlist_item_t, domain: string): Promise<video_info_t> => {
  const title = ep.caption;
  let src: string | undefined = undefined;

  if (ep.src0) {
    src = `https://v.${domain}${ep.src0}`;
  } else if (ep.src1) {
    const resp = await fetch(`https://${domain}/getvddr3/video?` + new URLSearchParams({
      id: ep.src1,
      type: 'json'
    }), {
      headers: {
        ...PC_USER_AGENT,
      }
    });
    const res = await resp.json();
    src = res.url;
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

