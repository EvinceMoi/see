// deno-lint-ignore-file no-explicit-any
import { crypto, } from '@std/crypto';
import { encodeHex } from '@std/encoding/hex';
import { ensureDirSync } from '@std/fs';
import qrcode from 'qrcode';
import { configDir, loadConfigFile, saveConfigFile, abortable_fetch } from '@utils/common.ts';

const BASE_URL = 'https://passport.bilibili.com';
const APP_KEY = '4409e2ce8ffd12b8';
const APP_SECRET = '59b43e04ad6965f34319062b478f83dd';
const SAME_LINE = `\x1B[2K\r`;

type params_t = Record<string, any>;
type object_t = Record<string, any>;

const show_qrcode = (content: string) => {
  qrcode.generate(content, {
    small: true,
  });
};

const md5sum = (data: string) => {
  const hash = crypto.subtle.digestSync('MD5', new TextEncoder().encode(data));
  return encodeHex(hash);
};

const bilitv_sign = (params: params_t) => {
  params.appkey = APP_KEY;
  const to_sign = Object.keys(params)
    .sort().map((key) => {
      return `${key}=${params[key]}`;
    })
    .join('&');
  const sign = md5sum(to_sign + APP_SECRET);
  params.sign = sign;

  return params;
};

const ts = () => {
  return Math.floor(Date.now() / 1000);
};

const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const print = (msg: string) => {
  const txt = new TextEncoder().encode(msg);
  Deno.stdout.writeSync(txt);
};

const bili_request = async (path: string, params: params_t) => {
  params = bilitv_sign(params);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    body.set(k, v);
  }
  const response = await abortable_fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const res = await response.json();
  if (res.code != 0) {
    throw new Error(`bili_request error: ${res.code}, ${res.message}`);
  }

  return res.data;
};

const _save_auth = (
  data: { token_info: object_t; cookie_info: { cookies: object_t[] } },
) => {
  saveConfigFile('bilitv', 'auth.json', JSON.stringify(data, undefined, 4));

  // extract cookie
  const cookies = data.cookie_info.cookies;
  const encoded = cookies.map((cookie) => {
    return `${cookie.name}=${cookie.value}`;
  }).join('; ');
  saveConfigFile('bilitv', 'cookies', encoded);

  saveConfigFile('bilitv', 'last_login', String(ts()));
};
const _do_request_auth = async () => {
  const auth_params: params_t = {
    local_id: '0',
    ts: ts(),
  };
  return await bili_request(
    '/x/passport-tv-login/qrcode/auth_code',
    auth_params,
  ) as { url: string; auth_code: string };
};
const _do_poll_auth = async (auth_code: string) => {
  print(`${SAME_LINE}🟢 >> polling...`);
  const poll_params = {
    auth_code,
    local_id: '0',
    ts: ts(),
  };
  const poll = await bili_request(
    '/x/passport-tv-login/qrcode/poll',
    poll_params,
  ) as { token_info: object_t; cookie_info: { cookies: object_t[] } };
  print(`${SAME_LINE}✅ >> login success!\n`);
  _save_auth(poll);
};
const _do_refresh_auth = async (): Promise<boolean> => {
  const auth: any = loadConfigFile('bilitv', 'auth.json', true);
  if (!auth) return false;

  const token_info = auth.token_info;
  const { access_token, refresh_token } = token_info;

  const refresh_params = {
    access_key: access_token,
    refresh_token,
    ts: ts(),
  };

  try {
    const res = await bili_request(
      '/api/v2/oauth2/refresh_token',
      refresh_params,
    ) as { token_info: object_t; cookie_info: { cookies: object_t[] } };
    _save_auth(res);

    return true;
  } catch (e: any) {
    console.log('error refresh auth:', e.message);
    return false;
  }
};

const do_login = async () => {
  // tv login
  const auth_info = await _do_request_auth();

  show_qrcode(auth_info.url);
  print(`🔑 >> auth code: ${auth_info.auth_code} <<\n`);
  print('📱 >> scan qrcode to login <<\n');

  print(`▶️ >> start polling...`);
  let cd = 5;
  do {
    if (cd == 0) {
      // poll
      try {
        await _do_poll_auth(auth_info.auth_code);
        break;
      } catch (e: any) {
        print(`${SAME_LINE}❌ >> poll failed: ${e.message}`);
        await wait(2000);
      }
      cd = 5;
    } else {
      print(`${SAME_LINE}⏳ >> poll will start in ${cd} ...`);
      cd--;
      await wait(1000);
      // print(SAME_LINE);
    }
  } while (true);
};

export const ensure_login = async () => {
  ensureDirSync(configDir('bilitv'));

  do {
    // check last login
    const last_login_value = loadConfigFile('bilitv', 'last_login');
    if (!last_login_value) {
      // never perform login
      break;
    }
    const last_login = Number(last_login_value);
    const days = Math.ceil((ts() - last_login) / 24 / 60 / 60);
    console.log(`last login ${days} days before`);
    if (days > 30) {
      // refresh info
      console.log('refresh tokens');
      const ok = await _do_refresh_auth();
      if (!ok) break;
    }

    return;
  } while (false);

  // login
  console.log('\n\n >>> do login');
  await do_login();
};
