import { Command } from '@cliffy/command';
import plugins from './plugins/mod.ts';
// import { exit } from '@utils/common.ts';

// ['SIGINT', 'SIGTERM'].forEach(signal => {
//   Deno.addSignalListener(signal as Deno.Signal, () => {
//     exit();
//   });
// });

const see = new Command()
  .name('see')
  .version('0.1.0')
  .description('play streams')
  .meta('deno', Deno.version.deno)
  .meta('v8', Deno.version.v8)
  .meta('typescript', Deno.version.typescript)
  ;
see.action(() => {
  see.showHelp();
});

plugins.forEach((p) => {
  see.command(p.id, p.cmd);
});

await see.parse();
