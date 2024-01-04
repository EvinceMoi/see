`see` my fav streams via mpv, fuck browsers

## external tools

- mpv
- plugins dependancies
  - bilibili
    - [lux](https://github.com/iawia002/lux) - for stream info extraction
    - [danmu2ass](https://github.com/gwy15/danmu2ass) (ver >= 0.2.2) - for
      displaying danmu

## build

```sh
$ deno task plugin-export && deno task build
```

## usage

```sh
$ see --help
  Usage:   see  
  Version: 0.1.0

  deno: 1.39.1     
  v8: 12.0.267.8   
  typescript: 5.3.3

  Description:

    play streams

  Options:

    -h, --help     - Show this help.                            
    -V, --version  - Show the version number for this program.  

  Commands:

    dytv    <rid>                    - play douyu live         
    bili    <uri>                    - play bilibili video/live
    huya    <rid>                    - play huya live          
    freeok  <id> [episode]           - play freeok vod         
    ddys    <uri_or_name> [episode]  - play ddys video
```
