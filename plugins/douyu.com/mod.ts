import { Command } from 'cliffy/command/mod.ts';
import { get_play_url } from './dytv.ts';
import { play_video, set_term_title } from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';

const DEFAULT_CDN_DOMAIN = 'openflv-huos.douyucdn2.cn';

const douyu = new Command()
  .version('0.0.1')
  .description('play douyu live')
  .arguments('<rid:string>')
  .option('--cdn', 'use default cdn')
  .action(async (opts, rid) => {
    try {
      const cdn = opts.cdn ? DEFAULT_CDN_DOMAIN : null;
      const vi = await get_play_url(rid, cdn);
      if (vi.title) set_term_title(vi.title);
      // fix `[ffmpeg] http: Cannot reuse HTTP connection for different host: xxx.douyucdn2.cn:-1 != 111.19.145.183:-1`
      // see: https://github.com/mpv-player/mpv/issues/5286#issuecomment-415980517
      // vi.player_options = ['--demuxer-lavf-o-set=http_persistent=0'];
      vi.player_options = ['demuxer-lavf-o-set=http_persistent=0'];
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
