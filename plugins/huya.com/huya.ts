import dayjs from 'dayjs';
import {
  abortable_fetch,
  MOBILE_USER_AGENT,
  type video_info_t,
  md5sum,
  decodeBase64,
} from '@utils/common.ts';
import { maxBy } from '@std/collections';

const fetch_html = async (url: string): Promise<string> => {
  const resp = await abortable_fetch(url, {
    headers: {
      ...MOBILE_USER_AGENT,
    },
  });
  return resp.text();
};
const get_info = async (rid: string): Promise<string> => {
  return await fetch_html(
    `https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid=${rid}`,
  );
};

const get_uid = async (): Promise<string> => {
  // return '0';
  const resp = await abortable_fetch(
    `https://udblgn.huya.com/web/anonymousLogin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: 5002,
        byPass: 3,
        context: '',
        version: '2.4',
        data: {},
      }),
    },
  );
  const json = await resp.json();
  const uid = json['data']['uid'] as string;
  return uid;
};

export const get_play_url = async (rid: string): Promise<video_info_t> => {
  const uid = await get_uid();
  const info = await get_info(rid);
  const json = JSON.parse(info);
  const data = json['data'];

  const live_status = data['liveStatus'];
  // ON / REPLAY
  if (!['ON', 'REPLAY'].includes(live_status)) {
    throw new Error('room is not living at the moment');
  }

  const rnick = data['liveData']['nick'];
  const rgame = data['liveData']['gameFullName'];
  const rdesc = data['liveData']['introduction'];
  const start_time = dayjs.unix(data['liveData']['startTime']).format(
    'YYYY-MM-DD HH:mm:ss',
  );

  if (live_status === 'ON') {
    const streams = data['stream']['baseSteamInfoList'] as object[];
    const stream = streams[0];
    const flv_url = stream['sFlvUrl'];
    const stream_name = stream['sStreamName'];
    const flv_url_suffix = stream['sFlvUrlSuffix'];
    const flv_anti_code = stream['sFlvAntiCode'];

    const query = new URLSearchParams(flv_anti_code);
    query.set('ver', '1');
    query.set('sv', '2110211124');
    const seqid = Number.parseInt(uid) + Date.now();
    query.set('seqid', seqid.toString());
    query.set('uid', uid);
    const ct = Math.floor((Number.parseInt(query.get('wsTime') as string, 16) + Math.random()) * 1000);
    const uuid = Math.floor((ct % 1e10 + Math.random()) * 1000).toString().substring(0, 10);
    query.set('uuid', uuid);

    const ss = md5sum(`${seqid}|${query.get('ctype')}|${query.get('t')}`);
    const fm = query.get('fm') as string;
    const wsSecret = md5sum(
      String.fromCharCode(...decodeBase64(fm))
        .replace('$0', uid)
        .replace('$1', stream_name)
        .replace('$2', ss)
        .replace('$3', query.get('wsTime') as string)
    );
    query.set('wsSecret', wsSecret);
    const parms = query.toString();
    const url = `${flv_url}/${stream_name}.${flv_url_suffix}?${parms}`;

    console.log('url:', url);

    return {
      title: `虎牙 - ${rid}|${rnick} - ${rdesc}|${rgame} - [${start_time}]`,
      video: url,
    };
  }

  const url = data['liveData']['hlsUrl'];

  return {
    title:
      `虎牙 - ${rid}|${rnick} - ${rdesc}|${rgame} - [${start_time}] - [Replay]`,
    video: url,
  };
};
