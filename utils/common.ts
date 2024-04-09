import { join } from 'std/path/mod.ts';
// import puppeteer, { Browser, Page } from 'puppeteer';
import { Mpv } from '@utils/mpv.ts';

export const configDir = (plugin: string) => {
  const home = Deno.env.get('HOME')!;
  return `${home}/.config/stream/${plugin}`;
};

export const loadConfigFile = (
  plugin: string,
  file: string,
  json = false,
): string | null => {
  const file_path = join(configDir(plugin), file);
  try {
    const content = Deno.readTextFileSync(file_path);
    if (!json) {
      return content;
    } else {
      return JSON.parse(content);
    }
  } catch (_) {
    return null;
  }
};

export const saveConfigFile = (
  plugin: string,
  file: string,
  content: string,
): boolean => {
  const file_path = join(configDir(plugin), file);
  try {
    Deno.writeTextFileSync(file_path, content);
    return true;
  } catch (_) {
    return false;
  }
};

export const seq = (start = 0, end: number | undefined = undefined) => {
  const origin = start;
  return {
    *[Symbol.iterator]() {
      while (true) {
        const t = this.next();
        yield t.value;
        if (t.done) {
          break;
        }
      }
    },
    next: () => {
      const it = start++;
      if (!Number.isSafeInteger(start)) start = origin;
      return {
        value: it,
        done: end && start >= end,
      };
    },
  };
};

export interface video_info_t {
  title?: string;
  video?: string;
  audio?: string;
  subtitle?: string;
  geometry?: string;
  mute?: boolean;
  referrer?: string;
  player_options?: string[];
}

let mpv: Mpv = new Mpv({ mode: 'multiple' });

export const enable_player_single_mode = () => {
  mpv = new Mpv({ mode: 'single' });
};

export const play_video = async (vi: video_info_t) => {
  await mpv.play(vi);
  await mpv.wait_for_finish();
};

export const set_term_title = (title: string) => {
  const buf = String.fromCharCode(27) + ']0;' + title + String.fromCharCode(7);
  Deno.stdout.writeSync(new TextEncoder().encode(buf));
};

export const PC_USER_AGENT = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};
export const MOBILE_USER_AGENT = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Mobile Safari/537.36',
};

// export const with_browser = async (cb: (browser: Browser) => Promise<void>) => {
//   let browser: Browser | undefined;
//   try {
//     browser = await puppeteer.launch({
//       // const browser: Browser = await puppeteer.launch({
//       defaultViewport: {
//         width: 800,
//         height: 600,
//       },
//       headless: true,
//       handleSIGINT: true,
//       handleSIGTERM: true,
//       args: [
//         '--disable-crash-reporter',
//         '--single-process',
//       ],
//     });
//     await cb(browser);
//   } finally {
//     browser?.disconnect().catch(() => {});
//     const process = browser?.process();
//     if (process) {
//       process.kill('SIGINT');
//       Deno.kill(process.pid!);
//     }
//   }
// };
// export const with_page = async <T>(
//   browser: Browser,
//   cb: (page: Page) => Promise<T>,
// ) => {
//   const page = await browser.newPage();
//   await page.setUserAgent(PC_USER_AGENT['User-Agent']);
//   await page.setViewport({ width: 800, height: 600 });

//   let ret: T;
//   try {
//     ret = await cb(page);
//   } finally {
//     page.close({ runBeforeUnload: true }).catch(() => { });
//   }

//   return ret;
// };

export let app_terminated = false;
const sig_listener = () => {
  app_terminated = true;
};
['SIGINT', 'SIGTERM'].forEach((signal) => {
  Deno.addSignalListener(signal as Deno.Signal, sig_listener);
});

export const exit = () => {
  app_terminated = true;
  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    Deno.removeSignalListener(signal as Deno.Signal, sig_listener);
  });
  mpv.quit();
};
