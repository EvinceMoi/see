import { Command } from "@cliffy/command";
import { get_play_url, get_playlist } from "./freeok.ts";
import {
  seq,
  app_terminated,
} from "@utils/common.ts";
import { mpv } from '@utils/mpvd.ts';
import { plugin_t } from "@utils/types.ts";

// const DEFAULT_CDN_DOMAIN = 'sf6-cdn-tos.douyinstatic.com';

const freeok = new Command()
  .version("0.0.1")
  .description("play freeok vod")
  .arguments("<id:string> [episode:number]")
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

      await mpv.start();
      for (const idx of seq(episode, playlist.length)) {
        if (app_terminated) break;
        const ep = playlist[idx];
        const vi = await get_play_url(ep);
        await mpv.play(vi);
        const eof = await mpv.wait_for_finish();
        if (eof === 'quit') break;
      }
    } catch (e: any) {
      console.log(e.message);
    }
    mpv.quit();
  });

const plugin: plugin_t = {
  id: "freeok",
  matches: [
    "freeok.one",
    "freeok.uk",
    "freeok.icu",
    "freeok.lol",
    "freeok.vip",
    "freeok.pro",
  ],
  cmd: freeok,
};

export default plugin;
