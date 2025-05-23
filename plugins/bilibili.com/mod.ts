import type { plugin_t } from '@utils/types.ts';
import { Command } from '@cliffy/command';
import { ensure_login } from './login.ts';
import { gen_url, get_live_info, get_playlist, get_video_info } from './bilitv.ts';
import { mpv } from '@utils/mpvd.ts';
import { seq, set_term_title } from '@utils/common.ts';

const is_int = (s) => {
  return !Number.isNaN(s) && !Number.isNaN(Number.parseInt(s));
};


const bili = new Command()
  .version('0.0.1')
  .description('play bilibili video/live')
  .option('--reverse,-r', 'playlist in reverse order')
  .option('--no-login', 'no login')
  .arguments('<uri:string> [p:number]')
  .action(async (opts, uri, p) => {
    try {
      if (opts.login) {
        await ensure_login();
      }

      if (opts['ao']) {
        mpv.set_option({audio_only: true});
      }

      await mpv.start();
      if (is_int(uri)) {
        const vi = await get_live_info(Number.parseInt(uri));
        await mpv.play(vi);
      } else {
        const [url, bvid, _pid] = gen_url(uri, p);

        const playlist = await get_playlist(url);
        console.log(playlist);
        if (opts['reverse']) {
          playlist.reverse();
        }
        if (playlist.length > 0) {
          const curr = playlist.findIndex(pi => {
            // return pi.vid === bvid;
            return pi.active;
          });
          // if (Number.isInteger(p)) {
          //   const offset = playlist.filter(pi => {
          //     return pi.vid === bvid;
          //   }).findIndex(pi => {
          //     return p === pi.p;
          //   });
          //   if (offset >= 0) curr += offset;
          // }

          playlist.forEach((it, idx) => {
            const pre = idx === curr ? '*' : ' ';
            console.log(`${pre} ${it.vid} -- ${it.title} -- ${it.duration}`);
          });

          for (const idx of seq(curr, playlist.length)) {
            const it = playlist[idx];
            try {
              const [url, bvid] = gen_url(it.vid, it.p);
              const vi = await get_video_info(url);
              if (vi.title)
                set_term_title(vi.title);

              console.log(`>>>> playing ${bvid} -- ${vi.title}`);
              await mpv.play(vi);
              const eof = await mpv.wait_for_finish();
              if (eof === 'quit') {
                break;
              }
            } catch (e: any) {
              console.log(e.message);
            }
          }
        }
        else {

          try {
            const vi = await get_video_info(url);
            if (vi.title)
              set_term_title(vi.title);

            await mpv.play(vi);
            const eof = await mpv.wait_for_finish();
            if (eof === 'quit') {
              console.log('quit');
            }
          } catch(e: any) {
            console.log(e.message);
          }
        }
      }
    } catch (e: any) {
      console.log(e.message);
    }
    mpv.quit();
  });

const plugin: plugin_t = {
  id: 'bili',
  matches: ['bilibili.com'],
  cmd: bili,
};

export default plugin;
