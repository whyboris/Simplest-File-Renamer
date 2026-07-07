# Simplest File Renamer

Rename your files and folders directly or with your favorite text editor, making use of all your 1337 keyboard shortcuts 😉

![image](https://user-images.githubusercontent.com/17264277/69740803-0042a680-1108-11ea-9821-bc7c7f8e522d.png)

## About

**Simplest File Renamer** was created by [Boris Yakubchik](https://videohubapp.com/en/about). It uses _Angular_ and _Tauri_.

Works on _Windows_, _Mac_, and _Linux_ :tada:

## Download

The download links for all platforms are located on the app's [public webpage](https://yboris.dev/renamer/)

## License

This software was built on top of [`angular-electron`](https://github.com/maximegris/angular-electron) by [Maxime GRIS](https://github.com/maximegris). It carries an [_MIT_ license](LICENSE).

## Development

Main dependencies in use:

| Library          | Version | Date     |
| ---------------- | ------- | -------- |
| Angular          | v20     | May 2025 |
| Angular-CLI      | v20     | May 2025 |
| Tauri            | v2.11.5 | Jun 2026 |

You will need to install `tauri` to develop and build this app. See [instructions](https://v2.tauri.app/start/prerequisites/)

Once you install `node` and `npm` just run `npm install`

After that `npm run dev` to develop & `npm run build` to build

## Notes

Version `1.0.0` of this application was released February 2020. It was initially built with _Electron_, but in July 2026 I finally found time to update the code to use _Tauri_. The installation in 2020 was about 50mb, but building basically the same code in 2026 with Electron made the installer about 130mb. By switching to _Tauri_ the resulting build was about 3mb.

## Thank you

This software would not be possible without the tremendous work by other people. An incomplete list:

- [Angular](https://github.com/angular/angular)
- [Tauri](https://github.com/tauri-apps/tauri)
- [Quill](https://github.com/quilljs/quill)

A huge personal _thank you_ to [Percipient24](https://github.com/Percipient24) for always helping me when I ask for coding help, and for his [code](https://codepen.io/percipient24/pen/eEBOjG) that inspired this project 🙇‍♂️
