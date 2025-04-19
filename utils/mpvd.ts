import { TextLineStream, toTransformStream } from '@std/streams';
import { EventEmitter } from 'node:events';
import { seq } from '@utils/common.ts';
import type { video_info_t } from '@utils/common.ts';

interface MpvPlayerOptions {
  audio_only?: boolean,
}
interface MpvIpcOptions {
  socket: string,
}
interface MpvEvent {
  event: string;
  reason?: string;
}
interface PromiseCtx {
  resolve: CallableFunction;
  reject: CallableFunction;
}
type MpvCommandArg = string | number;

class MpvIpc {
  #ipc: Deno.Conn;
  #idgen = seq(0);
  #requests: Map<number, PromiseCtx> = new Map();
  #events: EventEmitter;

  constructor(sock: Deno.Conn) {
    this.#ipc = sock;
    this.#events = new EventEmitter();
    this._do_read();
  }

  static async connect(path: string): Promise<MpvIpc> {
    const sock = await Deno.connect(
      {
        path,
        transport: 'unix',
      },
    );

    return new MpvIpc(sock);
  }

  _gen_id() {
    return this.#idgen.next().value;
  }

  async _do_read() {
    // do read
    const sjson = this.#ipc.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(toTransformStream(async function* (lines) {
        for await (const line of lines) {
          if (line.trim().length === 0) continue;

          yield JSON.parse(line);
        }
      }));

    try {
      for await (const msg of sjson) {
        if ('request_id' in msg && this.#requests.has(msg.request_id)) {
          const ctx = this.#requests.get(msg.request_id)!;
          this.#requests.delete(msg.request_id);
          if (msg.error !== 'success') {
            ctx.reject(new Error(msg));
          } else {
            ctx.resolve(msg.data);
          }
        }

        if ('event' in msg) {
          // handle event
          const et = msg.event;
          this.#events.emit(et, msg);
        }
      }
    } catch (_e) {
      // canceled
    }
  }

  send_command(
    command: MpvCommandArg[],
    is_async: boolean | undefined = true,
  // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const cmd_id = this._gen_id();
      this.#requests.set(cmd_id, { resolve, reject });
      const req = {
        request_id: cmd_id,
        command,
        async: is_async,
      };
      // biome-ignore lint/style/useTemplate: <explanation>
      const to_send = JSON.stringify(req) + '\n';
      this.#ipc.write(new TextEncoder().encode(to_send));
    });
  }

  wait_for_finish(): Promise<MpvEvent> {
    return new Promise((resolve) => {
      this.#events.once('end-file', resolve);
    });
  }

  shutdown() {
    this.#requests.clear();
    this.#ipc.close();
  }
}

type MpvOptions = MpvPlayerOptions | MpvIpcOptions;
class Mpv {
  #process: Deno.ChildProcess | null = null;
  #ipc: MpvIpc | null = null;
  #opts: MpvOptions;
  constructor(opts: MpvOptions) {
    this.#opts = opts;
  }

  set_option(opt: Partial<MpvOptions>) {
    this.#opts = {
      ...this.#opts,
      ...opt
    };
  }

  start() {
    return this.#start(this.#opts);
  }

  async #start(opts: MpvOptions): Promise<void> {
    // start mpv
    this.#start_mpv(opts as Extract<MpvOptions, MpvPlayerOptions>);
    await new Promise((resolve) => setTimeout(resolve, 200));
    // start ipc
    await this.#start_ipc(opts as Extract<MpvOptions, MpvIpcOptions>);
  }

  #start_mpv(opts?: MpvPlayerOptions) {
    const args = ['--profile=see'];
    if (opts?.audio_only) {
      args.push('--vo=null');
    } else {
      args.push('--idle');
    }
    const command = new Deno.Command('mpv', {
      args,
    });
    this.#process = command.spawn();
    this.#process.unref();
  }
  async #start_ipc(opts: MpvIpcOptions) {
    this.#ipc = await MpvIpc.connect(opts.socket);
  }
  async quit() {
    this.#ipc?.shutdown();
    await this.#process?.status;
  }

  async play(vi: video_info_t) {
    let fileoptions: string[] = [];
    if (vi.audio) fileoptions.push(`audio-file="${vi.audio}"`);
    if (vi.subtitle) fileoptions.push(`sub-file=${vi.subtitle}`);
    if (vi.title) fileoptions.push(`force-media-title="${vi.title}"`);
    const mute = vi.mute ?? 'no';
    fileoptions.push(`mute=${mute}`);
    if (vi.referrer) fileoptions.push(`referrer="${vi.referrer}"`);
    if (vi.player_options) {
      fileoptions = fileoptions.concat(
        vi.player_options.map((opt) => opt.replaceAll(/^-+/g, '')),
      );
    }
    if (vi.http_headers) {
      fileoptions = fileoptions.concat(
        vi.http_headers.map((opt) => {
          return `http-header-fields-append=%${opt.length}%${opt}`;
        }),
      );
    }
    const fo = fileoptions.join(',');

    const command: MpvCommandArg[] = ['loadfile', vi.video!, 'append-play', 0];
    if (fo) command.push(fo);

    await this.#ipc?.send_command(command);
  }

  async wait_for_finish(): Promise<string> {
    const msg = await this.#ipc!.wait_for_finish();
    return msg.reason || 'quit';
  }
}

const mpv_ipc_socket = '/tmp/mpvsocket-see';
const opts: MpvOptions = {
  audio_only: false,
  socket: mpv_ipc_socket,
};

const mpv = new Mpv(opts);

export {
  mpv,
  type MpvOptions,
  type MpvPlayerOptions,
};
