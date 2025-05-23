import { Command } from '@cliffy/command';
import { seq, app_terminated } from '@utils/common.ts';
import { mpv } from '@utils/mpvd.ts';
import type { plugin_t } from '@utils/types.ts';
import { get_playlist, get_video_info } from './ddys.ts';

const DOMAIN_NAME = `ddys.pro`;

const ddys = new Command()
  .version('0.0.1')
  .description('play ddys video')
  .arguments('<uri_or_name> [episode:number]')
  .action(async (opts, uri_or_name, episode) => {
    try {
      let uri: string;
      if (uri_or_name.startsWith('http')) {
        uri = uri_or_name;
      } else {
        uri = `https://${DOMAIN_NAME}/${uri_or_name}`;
        if (episode !== undefined) {
          uri += `?ep=${episode}`;
        }
      }

      const playlist = await get_playlist(uri);
      console.log('playlist:', playlist.map((p) => p.caption));

      await mpv.start();
      const curr: number = (episode ?? 1) - 1;
      for (const idx of seq(curr, playlist.length)) {
        if (app_terminated) break;
        const vi = await get_video_info(playlist[idx], DOMAIN_NAME);
        vi.referrer = `https://${DOMAIN_NAME}/`;
        vi.http_headers = [
          `authority: v.${DOMAIN_NAME}`,
          `accept: */*`,
          `accept-language: en-US,en;q=0.5`,
          `origin: https://${DOMAIN_NAME}`,
          `range: bytes=0-`,
          `referer: https://${DOMAIN_NAME}/`,
          `sec-ch-ua: "Chromium";v="122","Not(A:Brand";v="24","Brave";v="122"`,
          `sec-ch-ua-mobile: ?0`,
          `sec-ch-ua-platform: "Linux"`,
          `sec-fetch-dest: video`,
          `sec-fetch-mode: cors`,
          `sec-fetch-site: same-site`,
          `sec-gpc: 1`,
          `user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/122.0.0.0 Safari/537.36`
        ]
        await mpv.play(vi);
        const eof = await mpv.wait_for_finish();
        if (eof === 'quit') break;
      }
    } catch (e: any) {
      console.log(e.message);
    }
    mpv.quit();
  });

const plugin: plugin_t = {
  id: 'ddys',
  matches: [DOMAIN_NAME],
  cmd: ddys,
};

export default plugin;
