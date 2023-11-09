import { encode, Hash } from 'checksum';
import moment from 'moment';
import { video_info_t, MOBILE_USER_AGENT } from '@utils/common.ts';
import { decodeBase64 } from 'std/encoding/base64.ts';
import { maxBy } from 'std/collections/max_by.ts';

const md5sum = (data: string) => {
  return new Hash('md5').digest(encode(data)).hex();
}

const fetch_html = async (url: string): Promise<string> => {
  const resp = await fetch(url, {
    headers: {
      ...MOBILE_USER_AGENT,
    }
  });
  return resp.text();
}
const get_mobile_page = async (rid: string): Promise<string> => {
  return await fetch_html(`https://m.huya.com/${rid}`);
}

interface stream_info_t {
  error?: string,
  key?: string,
  url?: string,
}

const get_uid = async (): Promise<string> => {
  const resp = await fetch(`https://udblgn.huya.com/web/anonymousLogin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appId: 5002,
      byPass: 4,
      context: '',
      version: '2.4',
      data: {}
    }),
  });
  const json = await resp.json();
  return json['data']['uid'];
}

const gen_anti_code = (code: string, sname: string, uid: string) => {
  const kv = code.split('&').map(t => {
    return t.split('=');
  }).map(([k, v]) => {
    return [k, decodeURIComponent(v)];
  }) as [string, string][];
  const map = new Map([...kv]);
  map.set('ver', '1');
  map.set('sv', '2110211124');
  map.set('seqid', uid + Date.now().toString());
  map.set('uid', uid);
  map.set('uuid', crypto.randomUUID());

  const md5 = md5sum(`${map.get('seqid')}|${map.get('ctype')}|${map.get('t')}`);
  
  const fm = new TextDecoder().decode(decodeBase64(map.get('fm')!))
    .replace('$0', map.get('uid')!)
    .replace('$1', sname)
    .replace('$2', md5)
    .replace('$3', map.get('wsTime')!);
  
  const sec = md5sum(fm);
  map.set('wsSecret', sec);
  map.delete('fm');
  
  return [...map.entries()].map(kv => { return kv.join('='); }).join('&');
}

export const get_play_url = async (rid: string): Promise<video_info_t> => {
  const uid = await get_uid();
  const html = await get_mobile_page(rid);
  const match = html.match(/<script> window.HNF_GLOBAL_INIT = ([\s\S]*) <\/script>/);
  if (!match) {
    throw new Error('no match');
  }
  
  const content = JSON.parse(match[1]);
  const room_info = content['roomInfo'];
  const live_status = room_info['eLiveStatus'];
  if (live_status != 2) {
    throw new Error('room is not living at the moment');
  }
  

  const rnick = room_info['tLiveInfo']['sNick'];
  const rgame = room_info['tLiveInfo']['sGameFullName'];
  const start_time = moment(room_info['tLiveInfo']['iStartTime'] * 1000).format('YYYY-MM-DD HH:mm:ss');
  
  const streams = room_info['tLiveInfo']['tLiveStreamInfo']['vStreamInfo']['value'] as object[];
  const stream = maxBy(streams, s => s['iWebPriorityRate']) as object;
  const extract_url = stream => {
    const sname = stream['sStreamName'];
    const flv_url = stream['sFlvUrl'];
    const flv_ext = stream['sFlvUrlSuffix'];
    const hls_url = stream['sHlsUrl'];
    const hls_ext = stream['sHlsUrlSuffix'];
    const flv_auti_code = stream['sFlvAntiCode'];
    const hls_auti_code = stream['sHlsAntiCode'];
    const flv_ac = gen_anti_code(flv_auti_code, sname, uid);
    const hls_ac = gen_anti_code(hls_auti_code, sname, uid);
    
    const url_flv = `${flv_url}/${sname}.${flv_ext}?${flv_ac}`;
    const url_hls = `${hls_url}/${sname}.${hls_ext}?${hls_ac}`;
    const idx = Math.floor(Math.round(Math.random()));
    return [url_flv, url_hls][idx];
  }
  const url = extract_url(stream);

  return {
    title: `虎牙 - ${rid}|${rnick}|${rgame} - [${start_time}]`,
    video: url,
  };
}
