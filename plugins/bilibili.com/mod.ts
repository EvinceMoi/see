import { plugin_t } from '@utils/types.ts';
import { Command } from 'cliffy/command/mod.ts';
import { ensure_login } from './login.ts';
import { get_live_info, get_video_info } from './bilitv.ts';
import { play_video } from '@utils/common.ts';

const is_int = (s) => {
  return !isNaN(s) && !isNaN(parseInt(s));
};

const bili = new Command()
  .version('0.0.1')
  .description('play bilibili video/live')
  .option('--no-login', 'no login')
  .arguments('<uri:string> [p:number]')
  .action(async (opts, uri, p) => {
    try {
      if (opts.login) {
        await ensure_login();
      }

      if (is_int(uri)) {
        const vi = await get_live_info(parseInt(uri));
        await play_video(vi);
      } else {
        let u: URL;
        if (uri.startsWith('http')) {
          u = new URL(uri);
        } else {
          // BV string
          u = new URL(`https://www.bilibili.com/video/${uri}`);
        }

        let ep = 1;
        if (u.searchParams.has('p')) ep = parseInt(u.searchParams.get('p')!);
        if (Number.isInteger(p)) ep = p!;

        while (true) {
          u.searchParams.set('p', ep.toString());
          console.log('prepare to open:', u.toString());
          const vi = await get_video_info(u.toString());
          await play_video(vi);
          ep++;
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
