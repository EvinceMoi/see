import { Command } from 'cliffy/command/mod.ts';
import { get_play_url } from './dytv.ts';
import { play_video } from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';

const douyu = new Command()
  .version('0.0.1')
  .description('play douyu live')
  .arguments('<rid:string>')
  .action(async (_opts, rid) => {
    try {
      const vi = await get_play_url(rid);
      await play_video(vi);
    } catch (e) {
      console.log(e.message);
    }
  });

  const plugin: plugin_t = {
    id: 'dytv',
    matches: ['douyu.com'],
    cmd: douyu,
  };

  export default plugin;