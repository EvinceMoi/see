import { Command } from '@cliffy/command';
import { get_play_url } from './huya.ts';
import { set_term_title } from '@utils/common.ts';
import { mpv } from '@utils/mpvd.ts';
import { plugin_t } from '@utils/types.ts';

const huya = new Command()
  .version('0.0.1')
  .description('play huya live')
  .arguments('<rid:string>')
  .action(async (_opts, rid) => {
    try {
      const vi = await get_play_url(rid);
      if (vi.title) set_term_title(vi.title);
      vi.referrer = 'https://www.huya.com/';
      // const host = new URL(vi.video!).host;
      // vi.http_headers = [
      //     `authority: ${host}`,
      //     `accept: */*`,
      //     `accept-language: en-US,en;q=0.7`,
      //     `origin: https://www.huya.com`,
      //     `range: bytes=0-`,
      //     `referer: https://www.huya.com/`,
      //     `sec-ch-ua: "Chromium";v="122","Not(A:Brand";v="24","Brave";v="122"`,
      //     `sec-ch-ua-mobile: ?0`,
      //     `sec-ch-ua-platform: "Linux"`,
      //     `sec-fetch-dest: video`,
      //     `sec-fetch-mode: cors`,
      //     `sec-fetch-site: same-site`,
      //     `sec-gpc: 1`,
      //     `user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/122.0.0.0 Safari/537.36`
      // ];
      await mpv.play(vi);
      await mpv.wait_for_finish();
    } catch (e: any) {
      console.log(e.message);
    }
    mpv.quit();
  });

const plugin: plugin_t = {
  id: 'huya',
  matches: ['huya.com'],
  cmd: huya,
};

export default plugin;
