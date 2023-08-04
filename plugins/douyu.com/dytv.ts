import { encode, Hash } from 'checksum';
import { DOMParser } from 'deno_dom';
import moment from 'moment';
import { video_info_t, USER_AGENT } from '@utils/common.ts';

const md5sum = (data: string) => {
  return new Hash('md5').digest(encode(data)).hex();
}

const RE_KEY = /(\d{1,9}[0-9a-zA-Z]+)_?\d{0,4}p?(\/playlist|.m3u8|.flv)/;
const DID = '10000000000000000000000000001501';

interface room_info_t {
  rid: number;
  vipId: number;
  roomName: string;
  nickname: string;
  cate2Name: string;
  isLive: number;
  showTime: number;
}

const fetch_html = async (url: string): Promise<string> => {
  const resp = await fetch(url, {
    headers: {
      ...USER_AGENT
    }
  });
  return resp.text();
}
const get_mobile_page = async (rid: string): Promise<string> => {
  return await fetch_html(`https://m.douyu.com/${rid}`);
}
const get_pc_page = async (rid: string): Promise<string> => {
  return await fetch_html(`https://www.douyu.com/${rid}`);
}
const get_room_info = (html: string): room_info_t => {
  const doc = new DOMParser().parseFromString(html, 'text/html')!;
  const page_context_node = doc.querySelector('script[id="vite-plugin-ssr_pageContext"][type="application/json"]');
  if (!page_context_node) throw new Error('failed to get page context');
  const page_context = JSON.parse(page_context_node.textContent);
  return page_context.pageContext.pageProps.room.roomInfo.roomInfo as room_info_t;
}

interface stream_info_t {
  error?: string,
  key?: string,
  url?: string,
}
// deno-lint-ignore no-unused-vars
const get_stream_key_from_preview = async (rid: string): Promise<stream_info_t> => {
  const url = `https://playweb.douyucdn.cn/lapi/live/hlsH5Preview/${rid}`;
  const data = {
    rid,
    did: DID,
  };
  const now = Date.now().toString();
  const auth = md5sum(rid + now);
  const headers = {
    rid,
    time: now,
    auth
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...USER_AGENT,
      ...headers
    },
    body: new URLSearchParams(data)
  });
  const body = await resp.json();
  if (body.error != 0) {
    return {
      error: `[${body.error}] ${body.msg}`,
    };
  }

  const {
    // rtmp_cdn,
    // rtmp_url,
    rtmp_live
  } = body.data;

  const match = rtmp_live.match(RE_KEY);
  if (!match || match.length != 3) {
    return {
      error: 'failed to parse key',
    };
  }

  const [_, key, _suffix] = match;
  return {
    key
  };
}

const get_stream_from_pc_page = async (rid: string, html: string): Promise<stream_info_t> => {
  const match_func = html.match(/(var vdwdae325w_64we[\s\S]*function ub98484234[\s\S]*?)function/);
  if (!match_func) {
    return {
      error: 'failed to search func',
    };
  }
  const func_ub9 = match_func[1].replace(/eval.*?;}/g, 'strc;}');
  const ret = eval(`${func_ub9} ub98484234()`);

  const match_v = ret.match(/v=(\d+)/);
  if (!match_v) {
    return {
      error: 'failed to search v',
    };
  }

  const v = match_v[1];
  const ns = Math.floor(Date.now() / 1000);
  const rb = md5sum(rid + DID + String(ns) + v);

  let func_sign: string = ret.replace(/return rt;}\);?/, 'return rt;}');
  func_sign = func_sign.replace('(function (', 'function sign(');
  func_sign = func_sign.replace('CryptoJS.MD5(cb).toString()', '"' + rb + '"');

  const sign = eval(`${func_sign} sign('${rid}', '${DID}', '${ns}')`);
  // cdn: cdn: 主线路ws-h5, 备用线路tct-h5
  // rate: 1流畅, 2高清, 3超清, 4蓝光4M, 0蓝光8M或10M
  const cdn = `ws-h5`; const rate = `-1`;
  const params = `${sign}&cdn=${cdn}&rate=${rate}`;
  const api_url = `https://www.douyu.com/lapi/live/getH5Play/${rid}`;
  const resp = await fetch(api_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: params
  });
  const res = await resp.json();
  if (res.error !== 0) {
    return {
      error: JSON.stringify(res)
    };
  }
  /*
    {
      error: 0,
      msg: "",
      data: {
        room_id: 312407,
        rtmp_url: "https://stream-suzhou-cmcc-36-150-158-100.edgesrv.com:443/live",
        rtmp_live: "9999rMfVyoBTjV0x_4000.flv?wsAuth=8866...",
        ...
      }
    }
   */
  const { rtmp_url, rtmp_live } = res.data;
  const url = [rtmp_url, rtmp_live].join('/');
  const match = rtmp_live.match(RE_KEY);
  if (!match || match.length != 3) {
    return {
      error: 'failed to parse key',
    };
  }
  const [_, key, _suffix] = match;
  return {
    key,
    url,
  }
}

const get_stream_from_mobile_page = async (rid: string, html: string): Promise<stream_info_t> => {
  const match_func = html.match(/(function ub98484234.*)\s(var.*)/);
  if (!match_func) {
    return {
      error: 'failed to search func',
    };
  }
  const func_ub9 = match_func[0].replace(/eval.*;}/, 'strc;}');
  const ret = eval(`${func_ub9} ub98484234()`);

  const match_v = ret.match(/v=(\d+)/);
  if (!match_v) {
    return {
      error: 'failed to search v',
    };
  }

  const v = match_v[1];
  const ns = Math.floor(Date.now() / 1000);
  const rb = md5sum(rid + DID + String(ns) + v);

  let func_sign: string = ret.replace(/return rt;}\);?/, 'return rt;}');
  func_sign = func_sign.replace('(function (', 'function sign(');
  func_sign = func_sign.replace('CryptoJS.MD5(cb).toString()', '"' + rb + '"');

  const sign = eval(`${func_sign} sign('${rid}', '${DID}', '${ns}')`);
  const params = `${sign}&ver=219032101&rid=${rid}&rate=-1`;
  const resp = await fetch('https://m.douyu.com/api/room/ratestream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: params
  });
  const res = await resp.json();
  if (res.code !== 0) {
    return {
      error: JSON.stringify(res)
    };
  }
  /*
    {
      code: 0,
      data: {
        settings: [
          { name: "蓝光", rate: 0, high_bit: 1 },
          { name: "超清", rate: 3, high_bit: 0 },
          { name: "高清", rate: 2, high_bit: 0 }
        ],
        url: "http://hlstct.douyucdn2.cn/dyliveflv1a/312407rKBCavydRv_1024p.m3u8?txSecret=16754cf6382ac83b42f28388...",
        rate: 3,
        pass: 0
      }
    }
   */
  const url = res.data.url;
  const match = url.match(RE_KEY);
  if (!match || match.length != 3) {
    return {
      error: 'failed to parse key',
    };
  }
  const [_, key, _suffix] = match;
  return {
    key,
    url,
  }
}

export const get_play_url = async (rid: string, cdn_host: string | null = null): Promise<video_info_t> => {
  const title = (room: room_info_t) => {
    const open_time = moment(room.showTime * 1000).format('YYYY-MM-DD HH:mm:ss');
    return `斗鱼 - ${room.rid}|${room.nickname}|${room.cate2Name} - [${open_time}]`;
  };

  const html = await get_mobile_page(rid);
  const room_info = get_room_info(html);
  if (!room_info.isLive) throw new Error('room is not living at the moment');
  const real_rid = room_info.rid.toString();

  let stream_title = title(room_info);
  let video_url = '';
  if (cdn_host) {
    // 使用自定义cdn
    const { error, key } = await get_stream_from_mobile_page(real_rid, html);
    if (error) throw new Error(`failed to get stream info from mobile page: ${error}`);
    stream_title += ' - ' + key;
    video_url = `http://${cdn_host}/live/${key}_8000.xs`;
  } else {
    const page = await get_pc_page(rid);
    const { error, key, url } = await get_stream_from_pc_page(real_rid, page);
    if (error) throw new Error(`failed to get stream info from pc page: ${error}`);
    stream_title += ' - ' + key;
    video_url = url!;
  }
  
  return {
    title: stream_title,
    video: video_url,
  };
}
