import { Command } from 'cliffy/command/mod.ts';
import {
  enable_player_single_mode,
  play_video,
  seq,
  with_browser,
  with_page,
  exit,
} from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';
import { get_playlist, get_video_info } from './ddys.ts';

const DOMAIN_NAME = `ddys.pro`;

const ddys = new Command()
  .version('0.0.1')
  .description('play ddys video')
  .arguments('<uri_or_name> [episode:number]')
  .action(async (opts, uri_or_name, episode) => {
    let uri: string;
    if (uri_or_name.startsWith('http')) {
      uri = uri_or_name;
    } else {
      uri = `https://${DOMAIN_NAME}/${uri_or_name}`;
      if (episode != undefined) {
        uri += `?ep=${episode}`;
      }
    }

    if (opts['singleWindow']) {
      enable_player_single_mode();
    }

    await with_browser(async (browser) => {
      await with_page(browser, async (page) => {
        try {
          console.log('open uri:', uri);
          await page.goto(uri);

          const playlist = await get_playlist(page);
          console.log('playlist:', playlist.map((p) => p.caption));

          const selected_idx = playlist.findIndex((p) => p.selected);
          for (const idx of seq(selected_idx, playlist.length)) {
            const vi = await get_video_info(page, idx);
            vi.referrer = `https://${DOMAIN_NAME}/`;
            vi.player_options=[
              `--http-header-fields='authority: v.${DOMAIN_NAME}','accept: */*','accept-language: en-US,en;q=0.5','origin: https://${DOMAIN_NAME}','range: bytes=0-','referer: https://${DOMAIN_NAME}/','sec-ch-ua: "Chromium";v="122","Not(A:Brand";v="24","Brave";v="122"','sec-ch-ua-mobile: ?0','sec-ch-ua-platform: "Linux"','sec-fetch-dest: video','sec-fetch-mode: cors','sec-fetch-site: same-site','sec-gpc: 1','user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/122.0.0.0 Safari/537.36'`
            ];
            await play_video(vi);
          }
        } catch (e) {
          console.log('Error:', e.message);
        }
      });
    });
    // exit();
  });

const plugin: plugin_t = {
  id: 'ddys',
  matches: [DOMAIN_NAME],
  cmd: ddys,
};

export default plugin;
