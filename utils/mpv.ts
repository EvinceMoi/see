import { seq, video_info_t, app_terminated } from '@utils/common.ts';

const mpv_ipc_socket = '/tmp/mpvsocket-see';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type MpvMode = 'single' |'multiple';
interface MpvOptions {
  mode: MpvMode;
}

interface Player {
  play(vi: video_info_t): Promise<void>;
  wait_for_finish(): Promise<void>;
  quit(): void;
}

export class Mpv implements Player {
  #player: Player;

  constructor(opts?: MpvOptions) {
    const mode = opts?.mode ?? 'multiple';
    console.log(`mpv mode: ${mode}`);
    switch (mode) {
      case 'single':
        this.#player = new MpvSingle();
        break;
      case 'multiple':
        this.#player = new MpvMultiple();
        break;
      default:
        throw new Error(`unsupported mpv mode: ${mode}`);
    }
  }

  play(vi: video_info_t): Promise<void> {
    return this.#player.play(vi);
  }
  wait_for_finish(): Promise<void> {
    return this.#player.wait_for_finish();
  }
  quit() {
    return this.#player.quit();
  }
}

class MpvMultiple implements Player {
  #child: Deno.ChildProcess | null = null;

  constructor() { }
  async play(vi: video_info_t) {
    console.log(`playing ${vi.video}`);
    if (!vi.video) throw new Error('no playable stream');
    const args: string[] = [];
    args.push(vi.video);
    if (vi.audio) args.push(`--audio-file=${vi.audio}`);
    if (vi.subtitle) args.push(`--sub-file=${vi.subtitle}`);
    if (vi.title) args.push(`--force-media-title="${vi.title}"`);
    const mute = vi.mute ?? 'no';
    args.push(`--mute=${mute}`);
    if (vi.referrer) args.push(`--referrer=${vi.referrer}`);
    if (vi.player_options) args.push(...vi.player_options);

    const command = new Deno.Command('mpv', {
      args,
    });
    this.#child = command.spawn();
  }
  async wait_for_finish() {
    await this.#child?.status;
    this.#child = null;
  }
  quit(): void {
    this.#child?.kill();
    this.#child = null;
  }
}

type MpvCommandArg = string | number;
class MpvSingle implements Player {
  #child: Deno.ChildProcess | null = null;
  #ipc: Deno.UnixConn | null = null;
  #idgen = seq(0);
  #requests: Map<number, (result: any) => void> = new Map();

  constructor() {
    this._start_mpv();
  }

  async play(vi: video_info_t) {
    if (!vi.video) throw new Error('no playable stream');

    await this._start_mpv();
    await this._add_to_playlist(vi);
  }

  async wait_for_finish() {
    while (!app_terminated) {
      await sleep(360);

      try {
        const playlist_count = await this._send_command(['get_property', 'playlist/count']) as number;
        const playlist_pos = await this._send_command(['get_property', 'playlist-pos']) as number;
        if (playlist_pos != (playlist_count - 1)) continue;

        const remaining = await this._send_command(['get_property', 'playtime-remaining']) as number;
        if (isNaN(remaining) || remaining < 0.1) {
          break;
        }
      } catch (_) {
        // mpv not running
        break; 
      }
    }
  }

  quit() {
    this.#child?.kill();
  }

  async _start_mpv() {
    if (this.#ipc) {
      return;
    }

    const command = new Deno.Command('mpv', {
      args: [
        '--profile=see',
        '--idle',
      ],
    });
    this.#child = command.spawn();
    this.#child.unref(); // don't wait for child to exit
    this.#child.status.then(_ => {
      this._cleanup();
    });

    await sleep(100);

    // do ipc connect
    this.#requests.clear();
    this.#ipc = await Deno.connect(
      { path: mpv_ipc_socket, transport: 'unix' },
    );
  } 

  async _do_read() {
    // check if mpv is still running
    // await this._start_mpv();
    if (this.#ipc === null) return;

    // do read
    const reader = this.#ipc.readable.getReader();
    const stream = new ReadableStream({
      pull: (controller) => {
        reader.read().then(({ value, done }) => {
          if (done) {
            return;
          }

          const svalue = new TextDecoder().decode(value);
          const lines = svalue.split('\n');
          for (const line of lines) {
            const trimed = line.trim();
            if (!trimed) continue;
            controller.enqueue(trimed);
          }
        }).catch((e) => {
          controller.error(e);
        });
      }
    });

    const lines = stream.getReader();
    while (this.#requests.size > 0) {
      const { value, done } = await lines.read();
      if (done) {
        break;
      }
      try {
        const resp = JSON.parse(value);
        if ('request_id' in resp && this.#requests.has(resp.request_id)) {
          const resolve = this.#requests.get(resp.request_id)!;
          this.#requests.delete(resp.request_id);
          if (resp.error !== 'success') {
            resolve(Promise.reject(new Error(resp.error)));
          } else {
            resolve(resp.data);
          }
        }
      } catch (e) {
        console.error('failed to parse mpv response', e);
        break;
      }
    }
    reader.releaseLock();
  }
  async _add_to_playlist(vi: video_info_t) {
    let fileoptions: string[] = [];
    if (vi.audio) fileoptions.push(`audio-file=${vi.audio}`);
    if (vi.subtitle) fileoptions.push(`sub-file=${vi.subtitle}`);
    if (vi.title) fileoptions.push(`force-media-title=${vi.title}`);
    const mute = vi.mute ?? 'no';
    fileoptions.push(`mute=${mute}`);
    if (vi.referrer) fileoptions.push(`referrer=${vi.referrer}`);
    if (vi.player_options) fileoptions = fileoptions.concat(vi.player_options);
    const fo = fileoptions.join(',');

    const command = ['loadfile', vi.video!, 'append-play'];
    if (fo) command.push(fo);

    await this._send_command(command);
  }

  _gen_id() {
    return this.#idgen.next().value;
  }
  async _send_command(command: MpvCommandArg[], is_async: boolean | undefined = true) {
    if (this.#ipc === null) return;

    const cmd_id = this._gen_id();

    const req = {
      request_id: cmd_id,
      command,
    };
    if (is_async) {
      req['async'] = true;
    }

    const to_send = JSON.stringify(req) + '\n';
    try {
      await this.#ipc?.write(new TextEncoder().encode(to_send));
      return Promise.race([
        new Promise(resolve => { 
          this.#requests.set(cmd_id, resolve);
          this._do_read();
        }),
        new Promise((_, reject) => setTimeout(() => { 
          this.#requests.delete(cmd_id);
          reject(new Error('timeout'));
        }, 200)),
      ]);
    } catch (err) {
      // ipc closed
      this._cleanup();
      throw err;
      // console.error('mpv ipc error:', err);
    }
  }

  _cleanup() {
    this.#requests.clear();

    this.#ipc?.readable.cancel();
    this.#ipc = null;
    this.#child = null;
  }
}
