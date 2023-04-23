import { Command } from 'cliffy/command/mod.ts';
import { play_video, seq } from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';
import { get_playlist, get_video_info, open_page } from './ddys.ts';
import { Page } from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

const ddys = new Command()
  .version('0.0.1')
  .description('play ddys video')
  .arguments('<uri:string>')
  .action(async (_opts, uri) => {
    let page: Page | undefined;
    try {
      page = await open_page(uri);
      const playlist = await get_playlist(page);
      console.log('playlist:', playlist.map(p => p.caption));

      const selected_idx = playlist.findIndex(p => p.selected);
      for (const idx of seq(selected_idx)) {
        const vi = await get_video_info(page, idx);
        await play_video(vi);
      }
    } catch (e) {
      console.log(e.message);
    } finally {
      if (page) {
        const browser = page.browser();
        await page.close();
        await browser.close();
      }
      Deno.exit(1);
    }
  });

  const plugin: plugin_t = {
    id: 'ddys',
    matches: ['ddys.art'],
    cmd: ddys,
  };

  export default plugin;