import { play_video, video_info_t } from '@utils/common.ts';

const vi: video_info_t = {
  video: 'https://v.ddys.pro/v/kr_drama/Parasyte_The_Grey/Parasyte_The_Grey_S01E03.mp4',
  referrer: 'https://ddys.pro/',
  player_options: [
    `--http-header-fields='authority: v.ddys.pro','accept: */*','accept-language: en-US,en;q=0.5','origin: https://ddys.pro','range: bytes=0-','referer: https://ddys.pro/','sec-ch-ua: "Chromium";v="122","Not(A:Brand";v="24","Brave";v="122"','sec-ch-ua-mobile: ?0','sec-ch-ua-platform: "Linux"','sec-fetch-dest: video','sec-fetch-mode: cors','sec-fetch-site: same-site','sec-gpc: 1','user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/122.0.0.0 Safari/537.36'`
  ]
};

await play_video(vi);
