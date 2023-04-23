import { typeByExtension } from 'std/media_types/type_by_extension.ts';
import { ensureDirSync } from 'std/fs/mod.ts';
import { basename, join } from 'std/path/mod.ts';
import { configDir, video_info_t } from '@utils/common.ts';

const BASE_URL = 'https://www.bilibili.com';
const plug_name = 'bilitv';

const sub_path = (bvid: string) => {
  const tmp_dir = `/tmp/${plug_name}`;
  ensureDirSync(tmp_dir);

  return `${tmp_dir}/${bvid}.ass`;
}

export const get_video_info = async (url: string): Promise<video_info_t> => {
  const args: string[] = [];
  {
    try {
      const cookie_file = join(configDir(plug_name), 'cookies');
      const fi = Deno.statSync(cookie_file);
      if (fi.isFile) {
        args.push('-c', cookie_file);
      }
    } catch(_) {
      // not exist
    }
  }
  args.push('-j', url);
  console.log('lux', args.join(' '));
  const lux = new Deno.Command('lux', {
    args,
  });
  const { code, stdout, } = await lux.output();
  if (code !== 0) {
    throw new Error('failed to get video info');
  }
  const out = new TextDecoder().decode(stdout);
  const res = JSON.parse(out);
  if (res.length === 0) {
    throw new Error('video info empty');
  }

  const info = res[0];
  if (!info.streams) {
    throw new Error('failed to fetch info');
  }
  const vi: video_info_t = {};
  vi.title = info.title;

  const streams = info.streams;

  const keys = Object.keys(streams).sort((l, r) => {
    return r.padStart(10, '0').localeCompare(l.padStart(10, '0'))
  });
  if (keys.length === 0) {
    throw new Error('no streams');
  }
  console.log('streams:', keys);

  const key = keys[0];
  console.log('chosen stream:', key);
  const stream = streams[key];
  const parts = stream.parts;
  // deno-lint-ignore no-explicit-any
  parts.forEach((p: any) => {
    const mime = typeByExtension(p.ext);
    if (mime?.startsWith('video')) {
      vi.video = p.url;
    }
    if (mime?.startsWith("audio")) {
      vi.audio = p.url;
    }
  });

  const bvid = basename(new URL(url).pathname);
  const ass = sub_path(bvid);
  const download_danmu = Deno.run({
    cmd: [
      'danmu2ass',
      '-l', '20',
      '-d', '10',
      '--font', 'Noto Sans',
      '--font-size', '22',
      '-p', '0.3',
      '-a', '0.6',
      url,
      '-o', ass,
    ]
  });
  await download_danmu.status();

  vi.subtitle = ass;
  vi.referrer = BASE_URL;

  return vi;
}
