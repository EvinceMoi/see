import { Command } from 'cliffy/command/mod.ts';
import { get_play_url, get_playlist } from './freeok.ts';
import {
  enable_player_single_mode,
  play_video,
  seq,
  app_terminated
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
      const playlist = await get_playlist(id);       episode = episode || 1;
      if (episode > playlist.length || episode < 0) {
        episode = 1;
      }
      episode -= 1;

      if (opts['singleWindow']) {
        enable_player_single_mode();
      }

      for (const idx of seq(episode, playlist.length)) {
        if (app_terminated) break;
        const ep = playlist[idx];
        const vi = await get_play_url(ep);
        await play_video(vi);
      }
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
