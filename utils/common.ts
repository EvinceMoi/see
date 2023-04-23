import { join } from "std/path/mod.ts";

export const configDir = (plugin: string) => {
  const home = Deno.env.get('HOME')!;
  return `${home}/.config/stream/${plugin}`;
};

export const loadConfigFile = (plugin: string, file: string, json = false): string | null => {
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

export const saveConfigFile = (plugin: string, file: string, content: string): boolean => {
  const file_path = join(configDir(plugin), file);
  try {
    Deno.writeTextFileSync(file_path, content);
    return true;
  } catch (_) {
    return false;
  }
};

export interface video_info_t {
  title?: string;
  video?: string;
  audio?: string;
  subtitle?: string;
  geometry?: string;
  mute?: boolean;
  referrer?: string;
}

export const play_video = async (vi: video_info_t) => {
  if (!vi.video) throw new Error('no playable stream');

  const args: string[] = [];
  args.push(vi.video);
  if (vi.audio) args.push(`--audio-file=${vi.audio}`);
  if (vi.subtitle) args.push(`--sub-file=${vi.subtitle}`);
  if (vi.title) args.push(`--force-media-title=${vi.title}`);
  const geometry = vi.geometry ?? '2160x1216';
  args.push(`--geometry=${geometry}`);
  const mute = vi.mute ?? 'no';
  args.push(`--mute=${mute}`);
  if (vi.referrer) args.push(`--referrer=${vi.referrer}`);

  const command = new Deno.Command('mpv', {
    args,
  });
  const child = command.spawn();
  await child.status;
};

export const seq = (start = 0) => {
  return {
    *[Symbol.iterator]() {
      while (true) {
        yield start++;
      }
    }
  }
};