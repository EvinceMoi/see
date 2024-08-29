// deno-lint-ignore-file no-explicit-any
import { Command } from '@cliffy/command';

export interface plugin_t {
  id: string;
  matches: string[];
  cmd: Command<any>;
}
