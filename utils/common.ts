import { join } from 'std/path/mod.ts';
import puppeteer, { Browser, Page } from 'puppeteer';
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
        if (t.done)
          break
      }
    },
    next: () => {
      const it = start++;
      if (!Number.isSafeInteger(start)) start = origin;
      return {
        value: it,
        done: end && start >= end
      }
    }
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

let mpv: Mpv = new Mpv({mode: 'multiple'});

export const enable_player_single_mode = () => {
  mpv = new Mpv({mode:'single'});
}

export const play_video = async (vi: video_info_t) => {
  await mpv.play(vi);
  await mpv.wait_for_finish();
}

export const exit = () => {
  mpv.quit();
}

export const set_term_title = (title: string) => {
  const buf = String.fromCharCode(27) + ']0;' + title + String.fromCharCode(7);
  Deno.stdout.writeSync(new TextEncoder().encode(buf));
};

export const PC_USER_AGENT = {
  'User-Agent':
    // 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};
export const MOBILE_USER_AGENT = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Mobile Safari/537.36',
};

export const with_browser = async (cb: (browser: Browser) => Promise<void>) => {
  const browser = await puppeteer.launch({
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    headless: true,
    // args: ['--headless=new'],
    // args: ['--headless=true'],
  });

  try {
    await cb(browser);
  } finally {
    await browser.close();
  }
};
export const with_page = async <T>(
  browser: Browser,
  cb: (page: Page) => Promise<T>,
) => {
  const page = await browser.newPage();
  await page.setUserAgent(PC_USER_AGENT['User-Agent']);
  await page.setViewport({ width: 1920, height: 1080 });

  let ret: T;
  try {
    ret = await cb(page);
  } finally {
    await page.close();
  }

  return ret;
};
