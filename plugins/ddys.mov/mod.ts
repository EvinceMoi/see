import { Command } from 'cliffy/command/mod.ts';
import { play_video, seq, with_browser, with_page } from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';
import { get_playlist, get_video_info } from './ddys.ts';

const DOMAIN_NAME = `ddys.pro`;

const ddys = new Command()
  .version('0.0.1')
  .description('play ddys video')
  .arguments('<uri_or_name> [episode:number]')
  .action(async (_opts, uri_or_name, episode) => {
    let uri: string;
    if (uri_or_name.startsWith('http')) {
      uri = uri_or_name;
    } else {
      uri = `https://${DOMAIN_NAME}/${uri_or_name}`;
      if (episode != undefined) {
        uri += `?ep=${episode}`;
      }
    }

    await with_browser(async (browser) => {
      await with_page(browser, async (page) => {
        console.log('open uri:', uri);
        const playlist = await get_playlist(page, uri, true);
        console.log('playlist:', playlist.map((p) => p.caption));

        const selected_idx = playlist.findIndex((p) => p.selected);
        for (const idx of seq(selected_idx, playlist.length)) {
          const vi = await get_video_info(page, playlist, idx);
          await play_video(vi);
        }
      });
    });
  });

const plugin: plugin_t = {
  id: 'ddys',
  matches: [DOMAIN_NAME],
  cmd: ddys,
};

export default plugin;
