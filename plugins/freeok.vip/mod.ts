import { Command } from 'cliffy/command/mod.ts';
import { get_play_url, get_playlist } from './freeok.ts';
import {
  enable_player_single_mode,
  play_video,
  seq,
  with_browser,
  with_page,
} from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';

// const DEFAULT_CDN_DOMAIN = 'sf6-cdn-tos.douyinstatic.com';

const freeok = new Command()
  .version('0.0.1')
  .description('play freeok vod')
  .arguments('<id:string> [episode:number]')
  // .option('--cdn', 'use default cdn')
  .action(async (opts, id, episode) => {
    try {
      // const cdn = opts.cdn ? DEFAULT_CDN_DOMAIN : null;
      const playlist = await get_playlist(id);
      episode = episode || 1;
      if (episode > playlist.length || episode < 0) {
        episode = 1;
      }
      episode -= 1;

      if (opts['singleWindow']) {
        enable_player_single_mode();
      }

      await with_browser(async (browser) => {
        for (const idx of seq(episode, playlist.length)) {
          const ep = playlist.at(idx)!;
          const vi = await with_page(browser, async (page) => {
            return await get_play_url(page, ep);
          });
          await play_video(vi);
        }
      });
    } catch (e) {
      console.log(e.message);
    }
  });

const plugin: plugin_t = {
  id: 'freeok',
  matches: ['freeok.vip', 'freeok.pro'],
  cmd: freeok,
};

export default plugin;
