import { Command } from 'cliffy/command/mod.ts';
import { get_play_url } from './huya.ts';
import { play_video, set_term_title } from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';

const huya = new Command()
  .version('0.0.1')
  .description('play huya live')
  .arguments('<rid:string>')
  .action(async (_opts, rid) => {
    try {
      const vi = await get_play_url(rid);
      if (vi.title) set_term_title(vi.title);
      await play_video(vi);
    } catch (e) {
      console.log(e.message);
    }
  });

const plugin: plugin_t = {
  id: 'huya',
  matches: ['huya.com'],
  cmd: huya,
};

export default plugin;
