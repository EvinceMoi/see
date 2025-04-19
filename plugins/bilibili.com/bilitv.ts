import { typeByExtension } from '@std/media-types';
import { ensureDirSync } from '@std/fs';
import { basename, join } from '@std/path';
import { maxBy } from '@std/collections';
import { configDir, PC_USER_AGENT, type video_info_t, abortable_fetch } from '@utils/common.ts';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.bilibili.com';
const plug_name = 'bilitv';

const sub_path = (bvid: string) => {
  const tmp_dir = `/tmp/${plug_name}`;
  ensureDirSync(tmp_dir);

  return `${tmp_dir}/${bvid}.ass`;
};

export const get_video_info = async (url: string): Promise<video_info_t> => {
  const args: string[] = [];
  {
    try {
      const cookie_file = join(configDir(plug_name), 'cookies');
      const fi = Deno.statSync(cookie_file);
      if (fi.isFile) {
        args.push('-c', cookie_file);
      }
    } catch (_) {
      // not exist
    }
  }
  args.push('-j', url);
  console.log('lux', args.join(' '));
  const lux = new Deno.Command('lux', {
    args,
  });
  const { code, stdout } = await lux.output();
  if (code !== 0) {
    throw new Error('failed to get video info');
  }
  const out = new TextDecoder().decode(stdout);
  const res = JSON.parse(out);
  if (res.length === 0) {
    throw new Error('video info empty');
  }

  const info = res[0];
  if (!info.streams) {
    throw new Error('failed to fetch info');
  }
  const vi: video_info_t = {};
  vi.title = info.title;

  const streams = info.streams;

  const keys = Object.keys(streams).sort((l, r) => {
    return r.padStart(10, '0').localeCompare(l.padStart(10, '0'));
  });
  if (keys.length === 0) {
    throw new Error('no streams');
  }

  const key = keys[0];
  const stream = streams[key];
  const parts = stream.parts;
  // deno-lint-ignore no-explicit-any
    parts.forEach((p: any) => {
    const mime = typeByExtension(p.ext);
    if (mime?.startsWith('video')) {
      vi.video = p.url;
    }
    if (mime?.startsWith('audio')) {
      vi.audio = p.url;
    }
  });

  const bvid = basename(new URL(url).pathname);
  const ass = sub_path(bvid);
  const download_danmu = new Deno.Command('danmu2ass', {
    args: [
      '-l',
      '20',
      '-d',
      '10',
      '--font',
      'Noto Sans',
      '--font-size',
      '22',
      '-p',
      '0.3',
      '-a',
      '0.6',
      url,
      '-o',
      ass,
    ],
  });
  await download_danmu.output();

  vi.subtitle = ass;
  vi.referrer = BASE_URL;

  return vi;
};

export const get_live_info = async (rid: number): Promise<video_info_t> => {
  const cookie_file = join(configDir(plug_name), 'cookies');
  const cookies = await Deno.readTextFile(cookie_file);
  const cookie_header = {
    'Cookie': cookies,
  };

  const room_info_res = await abortable_fetch(
    `https://api.live.bilibili.com/room/v1/Room/room_init?id=${rid}`,
    {
      headers: {
        ...PC_USER_AGENT,
        ...cookie_header,
      },
    },
  );
  const room_info = await room_info_res.json();
  /*
    { "code":0,"msg":"ok","message":"ok",
      "data": {
        "room_id":7685334,"short_id":888,"uid":3117396,
        "need_p2p":0,"is_hidden":false,"is_locked":false,"is_portrait":false,
        "live_status":1,
        "hidden_till":0,"lock_till":0,"encrypted":false,"pwd_verified":false,
        "live_time":1685159782,
        "room_shield":1,"is_sp":0,"special_type":0
      }
    }
  */
  if (room_info.code !== 0) {
    throw new Error(room_info.msg);
  }

  const ri = room_info.data;
  if (ri.live_status !== 1) {
    throw new Error('room is not living at the moment');
  }

  const real_rid = ri.room_id;

  const play_info_url =
    "https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo";
  const params = new URLSearchParams({
    room_id: real_rid,
    protocol: '0,1',
    format: '0,1,2',
    codec: '0,1',
    qn: '10000', // 原画
    platform: 'h5',
    ptype: '8',
  });
  const res = await abortable_fetch(`${play_info_url}?${params}`, {
    headers: {
      ...PC_USER_AGENT,
      ...cookie_header,
    },
  });
  const sinfo = await res.json();
  const playurl_info = sinfo.data.playurl_info;
  const streams = playurl_info.playurl.stream;
  const stream = streams[0];
  const codec = maxBy(
    stream.format[0].codec,
    (c: Record<string, any>) => c.current_qn,
  );
  if (!codec) {
    throw new Error('no codec found');
  }
  const base_url = codec.base_url;
  const url_info = codec.url_info[0];
  const { host, extra } = url_info;

  return {
    video: `${host}${base_url}${extra}`,
    title: real_rid,
  };
};

interface playlist_item_t {
  vid: string;
  title: string;
  duration: string;
  p?: number;
}

const fetch_html = async (url: string): Promise<string> => {
  // const u = new URL(url);
  const resp = await abortable_fetch(url, {
    headers: { ...PC_USER_AGENT, },
  });
  return resp.text();
};

export const get_playlist = async (uri: string): Promise<playlist_item_t[]> => {
  const html = await fetch_html(uri);
  const $ = cheerio.load(html);
  const pods = $('div.pod-item');
  const pl: playlist_item_t[] = [];
  pods.each((_idx, el) => {
    const bvid = el.attribs['data-key'];
    const single = $(el).children('div').first().hasClass('single-p');
    if (single) {
      const it = {
        vid: bvid,
        title: $(el).find('.title-txt').text(),
        duration: $(el).find('.duration').text().trim()
      };
      pl.push(it);
    } else {
      const base = $(el).find('div');
      const head = $(base).find('.head');
      const title = $(head).find('.title-txt').text();
      const pagelist = $(base).find('.page-list');
      const pages = $(pagelist).children('.page-item');
      pages.each((idx, el) => {
        const ptitle = $(el).find('.title-txt').text();
        const it = {
          vid: bvid,
          title: `${title} - P${ptitle}`,
          duration: $(el).find('.duration').text().trim(),
          p: idx + 1,
        };
        console.log(it);
        pl.push(it);
      });
    }
  });
  return pl;
}