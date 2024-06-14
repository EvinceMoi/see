import dayjs from 'dayjs';
import {
  abortable_fetch,
  MOBILE_USER_AGENT,
  video_info_t,
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

export const get_play_url = async (rid: string): Promise<video_info_t> => {
  // const uid = await get_uid();
  const html = await get_info(rid);
  const json = JSON.parse(html);
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

  if (live_status == 'ON') {
    // flv or hls
    const streams = data['stream']['flv']['multiLine'] as object[];
    const stream = maxBy(streams, (s) => s['webPriorityRate']) as object;
    const url = stream['url'];

    return {
      title: `虎牙 - ${rid}|${rnick} - ${rdesc}|${rgame} - [${start_time}]`,
      video: url,
    };
  } else {
    const url = data['liveData']['hlsUrl'];

    return {
      title:
        `虎牙 - ${rid}|${rnick} - ${rdesc}|${rgame} - [${start_time}] - [Replay]`,
      video: url,
    };
  }
};
