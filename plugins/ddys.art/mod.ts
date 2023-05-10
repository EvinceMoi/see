import { Command } from 'cliffy/command/mod.ts';
import { play_video, seq } from '@utils/common.ts';
import { plugin_t } from '@utils/types.ts';
import { get_playlist, get_video_info, open_page } from './ddys.ts';
import { Page } from 'puppeteer';

const DOMAIN_NAME = `ddys.art`;

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
        uri += `?ep=${episode}`
      }
    }
    let page: Page | undefined;
    try {
      console.log('open uri:', uri);
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
    matches: [DOMAIN_NAME],
    cmd: ddys,
  };

  export default plugin;