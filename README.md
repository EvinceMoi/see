`see` my fav streams via mpv, fuck browsers

## external tools
- mpv
- plugins dependancies
  - bilibili
    - [lux](https://github.com/iawia002/lux) - for stream info extraction
    - [danmu2ass](https://github.com/gwy15/danmu2ass) (ver >= 0.2.2) - for displaying danmu

## build

```sh
$ deno task plugin-export && deno task build
```

## usage

```sh
$ see --help
  Usage:   see
  Version: 0.1.0

  deno: 1.33.2
  v8: 11.4.183.1
  typescript: 5.0.3

  Description:

    play streams

  Options:

    -h, --help     - Show this help.
    -V, --version  - Show the version number for this program.

  Commands:

    dytv  <rid>                    - play douyu live
    bili  <uri>                    - play bilibili video
    huya  <rid>                    - play huya live
    ddys  <uri_or_name> [episode]  - play ddys video
```
```sh
$ see dytv --help
  Usage:   see dytv <rid>
  Version: 0.0.1

  Description:

    play douyu live

  Options:

    -h, --help                - Show this help.
    --no-cdn                  - dont use cdn (use url retrieved from mobile page)
    -b, --bitrate  <bitrate>  - bitrate                                            (Default: 8000)
```
```sh
$ see bili --help
  Usage:   see bili <uri>
  Version: 0.0.1

  Description:

    play bilibili video

  Options:

    -h, --help  - Show this help.
    --no-login  - no login

```