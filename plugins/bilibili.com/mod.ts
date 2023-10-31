
import { plugin_t } from '@utils/types.ts';
import { Command } from 'cliffy/command/mod.ts';
import { ensure_login } from './login.ts';
import { get_video_info, get_live_info } from './bilitv.ts';
import { play_video } from '@utils/common.ts';

const is_int = s => {
  return !isNaN(s) && !isNaN(parseInt(s));
}

const bili = new Command()
  .version('0.0.1')
  .description('play bilibili video/live')
  .option('--no-login', 'no login')
  .arguments('<uri:string>')
  .action(async (opts, uri) => {
    try {
      if (opts.login) {
        await ensure_login();
      }

      if (is_int(uri)) {
        const vi = await get_live_info(parseInt(uri));
        console.log('play url:', vi.video);
        await play_video(vi);
      } else {
        let u: URL;
        if (uri.startsWith('http')) {
          u = new URL(uri);
        } else {
          // BV string
          u = new URL(`https://www.bilibili.com/video/${uri}`);
        }

        const p: string = u.searchParams.get('p') || '1';
        let i = parseInt(p);
        while (true) {
          u.searchParams.set('p', i.toString());
          console.log('prepare to open:', u.toString());
          const vi = await get_video_info(u.toString());
          await play_video(vi);
          i++;
        }
      }
    } catch (e) {
      console.log(e.message);
    }
  });

const plugin: plugin_t = {
  id: 'bili',
  matches: ['bilibili.com'],
  cmd: bili,
};

export default plugin;