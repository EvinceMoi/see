import { join } from '@std/path/join';
import { crypto, } from '@std/crypto';
import { encodeHex } from '@std/encoding/hex';
// import puppeteer, { Browser, Page } from 'puppeteer';
// import { Mpv } from '@utils/mpv.ts';

export const md5sum = (data: string) => {
  const hash = crypto.subtle.digestSync('MD5', new TextEncoder().encode(data));
  return encodeHex(hash);
};

export const decodeBase64 = (data: string): Uint8Array => {
  return new Uint8Array([...atob(data)].map((c) => c.charCodeAt(0)));
};

export const encodeBase64 = (data: Uint8Array): string => {
  return btoa(String.fromCharCode(...data));
};

export const configDir = (plugin: string) => {
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
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
    // biome-ignore lint/style/noUselessElse: <explanation>
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
  http_headers?: string[]; // ['usage-agent': '', ...];
  player_options?: string[];
}

// let mpv: Mpv = new Mpv({ mode: 'multiple' });

// export const enable_player_single_mode = () => {
//   mpv = new Mpv({ mode: 'single' });
// };

// export const play_video = async (vi: video_info_t) => {
//   await mpv.play(vi);
//   await mpv.wait_for_finish();
// };

export const set_term_title = (title: string) => {
  // biome-ignore lint/style/useTemplate: <explanation>
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

const abort = new AbortController();

export let app_terminated = false;
const sig_listener = () => {
  abort.abort();
  app_terminated = true;
};
// biome-ignore lint/complexity/noForEach: <explanation>
['SIGINT', 'SIGTERM'].forEach((signal) => {
  Deno.addSignalListener(signal as Deno.Signal, sig_listener);
});

// export const exit = () => {
  // app_terminated = true;
  // ['SIGINT', 'SIGTERM'].forEach((signal) => {
  //   Deno.removeSignalListener(signal as Deno.Signal, sig_listener);
  // });
  
  // console.log('exit called');
  // mpv.quit();
// };

export const abortable_fetch = (url: string | URL | Request, init: RequestInit | undefined): Promise<Response> => {
  if (!init) {
  // biome-ignore lint/style/noParameterAssign: 
    init = {};
  }
  if (!init.signal) {
    init.signal = abort.signal;
  }
  return fetch(url, {
    ...init,
  });
};