<p align="center">
<img src="./youtube-dl-react-frontend/public/logo.svg" alt="icon" width="100px" height="100px" />
<h1 align="center">youtube-dl-react-viewer</h1>

**youtube-dl-react-viewer** is a web app for [yt-dlp](https://github.com/yt-dlp/yt-dlp) that supports viewing and downloading videos.

📷[Screenshots](https://imgur.com/a/l23b3dZ) | 🌎[Live Demo](https://react.gwalkerux.com)

---

- [FEATURES](#features)
- ✨[INSTALL WITH DOCKER](#docker-installation)✨
- [INSTALL MANUALLY](#manual-installation)
- [ENVIRONMENT VARIABLES](#environment-variables)
- [DOWNLOADING](#downloading)
- [IMPORTING ALREADY DOWNLOADED VIDEOS](#importing-already-downloaded-videos)
- [ISSUES & LIMITATIONS](#issues--limitations)
- [SCRIPTS](#scripts)
- [HANDLING DOWNLOAD ERRORS](#handling-download-errors)
- [FAQ](#faq)
- [PLANNED](#planned)
- [LICENSE/CREDITS](#licensecredits)
- [DISCLAIMER](#disclaimer)

---

## Features
- Download videos using [yt-dlp](https://github.com/yt-dlp/yt-dlp) by creating and running [download jobs](#downloading)
- Watch downloaded videos in the browser
- [Import already downloaded videos](#importing-already-downloaded-videos)
- SponsorBlock integration
- Return YouTube Dislike integration
- Watch history and resume playback across devices
- Full-text search for video titles, descriptions, and playlists
- Playlist autoplay & looping
- [Open video streams in VLC](#how-do-i-open-videos-in-vlc)
- Download video comments
- YouTube live chat replay
- Channel icon downloader (YouTube and SoundCloud)
- Caption and subtitle support
- Light and dark themes
- Display videos related to the current video
- Restrict access to the web app with a global password
- Verify the integrity (hash) of downloaded videos

## Install

> [!CAUTION]
> Only install the web app using release tags. Avoid installing directly from the main branch, as there may be breaking changes introduced between official releases.

> [!CAUTION]
> Downgrading an existing installation is not supported and may lead to database corruption. It is recommended to [backup your database](#how-do-i-backup-my-database) before upgrading versions.

### Docker Installation
1. Clone this repository

2. Open the repository directory `cd ./youtube-dl-react-viewer`

3. Select the release tag of the version you want to install `git checkout tags/v1.4.1`

4. Copy `.env.sample` to `.env`

5. Edit `.env` and [configure the required environment variables](#required-environment-variables)

6. Run `docker compose up -d` to build the image and start the container

7. The web app will be accessible in the browser at `http://localhost:5000`

#### Editing environment variables
Because `.env` is copied to the container during the build step the Docker image must be rebuilt in order to change environment variables. After editing `.env` run `docker compose build --no-cache app && docker compose up -d` to rebuild.

#### Updating a Docker Installation

> [!CAUTION]
> If you are updating a Docker installation from a version prior to 1.4.0 see the [v1.4.0 Docker Update Guide](./docs/v1.4.0-docker-update-guide.md)

1. Run `git pull`

2. Select the latest release `git checkout tags/v1.4.1`

3. Rebuild and restart the container `docker compose build --no-cache && docker compose up -d`

### Manual Installation
1. [Install Node.js 18.x.x (LTS)](https://nodejs.org/en/download/current/)

2. [Install MongoDB 6.0.x](https://www.mongodb.com/try/download/community)

3. [Install yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation) and add `yt-dlp` to PATH

4. [Install FFmpeg and FFprobe](https://ffmpeg.org/download.html) and add `ffmpeg` and `ffprobe` to PATH

5. Clone this repository

6. Open the repository directory `cd ./youtube-dl-react-viewer`

7. Select the release tag of the version you want to install `git checkout tags/v1.4.1`

8. Copy `.env.sample` to `.env`

9. Edit `.env` and [configure the required environment variables](#required-environment-variables)

10. Run the install script located in `./youtube-dl-react-viewer/scripts`

11. The web app will be accessible in the browser at `http://localhost:5000`

#### Managing the Web App Process
When installed manually the web app process is managed by [pm2](https://github.com/Unitech/pm2).

Usage:
- Start the web app `pm2 start youtube-dl-react-viewer`
- Stop the web app `pm2 stop youtube-dl-react-viewer`
- View logs `pm2 logs youtube-dl-react-viewer`
- Run at pc startup `pm2 startup youtube-dl-react-viewer` (unix only)

#### Updating a Manual Installation
1. Run `git pull`

2. Select the latest release `git checkout tags/v1.4.1`

3. Rerun the install script located in `./youtube-dl-react-viewer/scripts`

## Environment Variables
Configure environment variables by editing the `.env` file in the repository root directory. If this file does not exist yet copy `.sample.env` to `.env`. Use this file to set environment variables for both the frontend and backend. Some variables are required for the app to run, see [required environment variables](#required-environment-variables) for details.
<!-- Do not go past col 80 -->
```
OUTPUT_DIRECTORY                    Location downloads will be saved to
                                    (path, default: '/youtube-dl')

SUPERUSER_USERNAME                  Admin account username. The admin account
                                    is created when the web app is started
                                    (string < 50, default: admin)

SUPERUSER_PASSWORD                  Admin account password. If the value is
                                    `password` or less than 8 characters the
                                    web app will not start
                                    (string >= 8 && !== password, default:
                                    password)

JWT_TOKEN_SECRET                    Secret key to sign the JSON Web Token. If
                                    the value is `secret` the web app will not
                                    start. Use a securely generated random
                                    string at least 32 characters long
                                    (string !== secret, default: secret)

MONGOOSE_URL                        Database connection URL. If the database
                                    does not exist it will be created
                                    (url, default:
                                    mongodb://127.0.0.1:27017/youtubeDlDB)

BACKEND_PORT                        Port used to serve the web app
                                    (0-65535, default: 5000)

SECURE_COOKIES                      Only serve cookies over HTTPS. Enable if
                                    not running locally
                                    (true|false, default: false)

YOUTUBE_DL_PATH                     Path to yt-dlp. Forks should work as drop
                                    in replacements
                                    (path, default: yt-dlp)

FFMPEG_PATH                         Path to FFmpeg
                                    (path, default: ffmpeg)

FFPROBE_PATH                        Path to FFprobe
                                    (path, default: ffprobe)

THUMBNAIL_QUALITY                   JPEG quality level used when creating
                                    new thumbnails
                                    (0-100, default: 80)

THUMBNAIL_CHROMA_SUBSAMPLING        Chroma subsampling used when creating
                                    new thumbnails
                                    (4:4:4|4:2:0, default: 4:4:4)

PAGE_SIZE                           Number of videos that are loaded per page
                                    (number >= 1, default: 54)

SKIP_HASHING                        Skip generating hashes when downloading
                                    or importing videos
                                    (true|false, default: false)

ENABLE_USER_REGISTRATION            Allow users to create new accounts
                                    (true|false, default: true)

DISPLAY_SIMILAR_VIDEOS              Algorithm used to find similar videos.
                                    Consider disabling if page loads start to
                                    become slow
                                    (complex|simple|disabled, default: complex)

SPONSORBLOCK_API_URL                API used to retrieve sponsor segments
                                    (url, default: https://sponsor.ajay.app/)

SPONSORBLOCK_K_ANONYMITY            Use the k-anonymity system when fetching
                                    sponsor segments to preserve privacy
                                    (true|false, default: true)

RETURN_YOUTUBE_DISLIKE_API_URL      API used to retrieve video dislikes
                                    (url, default:
                                    https://returnyoutubedislikeapi.com/)

EXPOSE_LOCAL_VIDEO_PATH             Expose the local video path to allow for
                                    local VLC playback
                                    (true|false, default: false)

YOUTUBE_DL_UPDATE_COMMAND           Command run when updating yt-dlp from the
                                    admin panel. If not set will run `-U`
                                    (string, default: '')

UPDATE_YOUTUBE_DL_ON_JOB_START      Automatically update yt-dlp when a download
                                    job is started
                                    (true|false, default: false)

VERBOSE                             Print detailed error messages to the
                                    console
                                    (true|false, default: false)

NODE_ENV                            Should be set to `production` unless
                                    running in development mode `development`
                                    (string, default: production)

REACT_APP_BRAND                     Name shown in the navbar
                                    (string, default: youtube-dl Viewer)

REACT_APP_CHECK_FOR_UPDATES         Automatically check for new releases on the
                                    admin page
                                    (true|false, default: true) 

REACT_APP_SHOW_VERSION_TAG          Show the current release version number 
                                    in the navbar
                                    (true|false, default: true)

REACT_APP_LIGHT_THEME_LOGO          Light theme icon in the navbar
                                    (url, default: /logo.svg)

REACT_APP_DARK_THEME_LOGO           Dark theme icon in the navbar
                                    (url, default: /logo.svg)

REACT_APP_LOAD_EXTERNAL_THUMBNAILS  Load thumbnails and avatars from third
                                    parties
                                    (true|false, default: false)

REACT_APP_OUT_OF_DATE_COLOR_DAYS    Days until a job is highlighted in red to
                                    indicate it has not been run recently
                                    (number > 0, default: 30)

REACT_APP_REPO_NAME                 Name of the repository
                                    (string, default: youtube-dl-react-viewer)

REACT_APP_REPO_URL                  Link to the repository
                                    (url)

REACT_APP_GITHUB_API_URL            Link to the GitHub API URL for the latest
                                    release
                                    (url)

REACT_APP_LATEST_RELEASE_LINK       Link to the latest release page
                                    (url)

PORT                                Port used by the web app frontend in
                                    development mode
```
If the web app was installed using Docker you will need to rebuild the image after changing any environment variables by running `docker compose build --no-cache app && docker compose up -d`.

If the web app was installed manually you will need to rebuild the web app frontend after changing environment variables that start with `REACT_APP_`.

Changing `REACT_APP_LIGHT_THEME_LOGO`/`REACT_APP_DARK_THEME_LOGO` will not change the favicon and manifest icons. They can only be changed by replacing the icon files in `./youtube-dl-react-frontend/public` and rebuilding the web app frontend.

**To rebuild the web app frontend:**
```
cd ./youtube-dl-react-frontend
npm install --unsafe-perm
npm run build
```

### Required Environment Variables
These environment variables are required for the web app to run. Ensure they are set in the `.env` file in the repository root directory.

#### `OUTPUT_DIRECTORY`
The location on your device where downloads will be saved.

#### `SUPERUSER_USERNAME`
The username for the admin account. If an admin account with this username does not already exist, it will be created.

#### `SUPERUSER_PASSWORD`
The password for the admin account. The value cannot be `'password'` and must be at least 8 characters long.

#### `JWT_TOKEN_SECRET`
Used to sign the JSON Web Tokens (JWT). The value cannot be `'secret'` and it is recommended to use a random string of at least 32 characters.

#### `SECURE_COOKIES`
Determines whether cookies should be marked as secure. Set to `true` if using an HTTPS server. Set to `false` if running locally.

#### `BACKEND_PORT`
The port on which the web app will be served. The default port is `5000`. If another service is already using port `5000`, specify any other available port.

## Downloading

1. Sign into the web app with the admin account
2. Go to the [admin panel](http://localhost:5000/admin) and scroll to the Jobs section
3. Click the plus icon to create a new job, configure, and save it

    ```
    Job name                        Display name

    Format code                     Format code used by yt-dlp when downloading
                                    videos

    Download audio only             Enable to only download audio

    Download comments               Enable to download comments if supported
                                    for the website
    
    Recode video                    Enable to convert downloaded videos to mp4
                                    to increase browser playback compatibility
                                    (may reduce quality)

    URLs                            URLs that will be downloaded each time the
                                    job is run. URLs can be individual videos,
                                    channels, playlists, etc. One URL per line

    Override config                 Arguments passed to yt-dlp when
                                    downloading. For example, you can add
                                    `--cookies` here

    Override uploader               Treat all videos downloaded by this job as
                                    if they were uploaded by the specified
                                    uploader. Useful for websites that do not
                                    return a uploader name
    ```
4. Scroll to the Download section
5. Select and run the jobs you want to download. Multiple jobs can be selected. Jobs will run in the order they are started

## Importing Already Downloaded Videos

You can import videos already downloaded with yt-dlp as long as they were downloaded with `--write-info-json` and `--write-thumbnail` and the thumbnail and JSON files are in the same folder as the video.

1. Sign into the web app with the admin account
2. Go to the [admin panel](http://localhost:5000/admin) and scroll to the Import videos section, configure, and import

```    
Folder to import                    Folder to import videos from

Job                                 Job imported videos will be added to.
                                    Imported videos will appear in the web app
                                    as if they were downloaded by this job

Search subfolders                   Search subfolders for videos

Copy files                          Copy files instead of moving them

Continue on failed                  Continue importing videos instead of
                                    stopping if a video fails to import

Override ext                        Sometimes the video file extension cannot
                                    be determined when importing. If you know
                                    the extension and it is the same for all
                                    videos you can specify it here
```

> [!CAUTION]
> If the web app was installed using Docker you will need to copy the videos you want to import into the output directory first, then import the videos using the path on the container filesystem.
> 
> 1. Copy your videos from `C:\Your Existing Downloads` to `C:\Output Directory\TEMP`
> 2. In the web app import the folder `/youtube-dl/TEMP`
> 3. After importing `C:\Output Directory\TEMP` can be deleted

## Issues & Limitations

### Video Browser Playback
The default format code used to download videos is `bestvideo*+bestaudio/best`. This can sometimes create a video that cannot be played in the web browser, although this is dependent on the specific web browser and device. If a playback error occurs try: [opening the video in VLC](#how-do-i-open-videos-in-vlc), using a different browser, or changing the format code and redownloading.

To download videos that may have a greater chance of playing in the web browser try using the format code `(bestvideo[vcodec^=h264]+bestaudio[acodec^=aac])/mp4/best` instead, or enable recode video in the download job settings (may reduce quality).

### Missing Videos in Playlists
yt-dlp only downloads playlist metadata for videos if they were downloaded as part of a playlist. If you have already downloaded a video and then download a playlist that includes the same video it will not appear in the playlist in the web app. To prevent this it is recommended to download playlists before downloading individual videos.

### Windows Path Limit
File paths on Windows cannot be longer than 260 characters. To prevent errors where downloaded videos exceed the path length limit, set the output directory to a location as close to the root directory as possible (i.e., `C:\Output Directory`). Alternatively, you can remove the path length limit on Windows by [enabling long paths](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation?tabs=registry#enable-long-paths-in-windows-10-version-1607-and-later).

## Scripts
Scripts offer or extend functionality that is not present in youtube-dl-react-viewer by default.

- [A Node.js script to automatically run download jobs at a specified time using a cron scheduler](./examples/nodejs-schedule-download-jobs.js)
- [A bookmarklet to append the URL of the current page to a specified download job](./examples/bookmarklet-append-url-to-job.js)
- [A bookmarklet to start running any number of specified download jobs](./examples/bookmarklet-download-jobs.js)

## Handling Download Errors

There are two types of errors that can occur when downloading videos:
### yt-dlp fails to download a video
This could happen for many reasons: poor internet connection, broken extractor, private video, etc. yt-dlp will try to download the video again the next time the job is run.

### yt-dlp successfully downloads a video, but the web app fails to parse it
If the web app fails to parse the video metadata the video will appear under the Failed to parse section of the admin panel. yt-dlp will not try to redownload the video as it has been successfully downloaded.

You can attempt to retry parsing the video from the Failed to parse section of the admin panel, however, this will likely still fail until a version of the web app that fixes the issue is released. Report parsing errors [here](https://github.com/graham-walker/youtube-dl-react-viewer/issues).

## FAQ
### How do I open videos in VLC?
To open videos from the web app in VLC on PC/Mac you must register the `vlc://` URL protocol. You can do this with [stefansundin/vlc-protocol](https://github.com/stefansundin/vlc-protocol/).

No additional configuration is required for iOS/Android devices.

### How do I download from websites that require a login?

You can download from websites that require a login by passing your cookies to the download job. In job settings under Advanced options in Override config you can set `--cookies` or `--cookies-from-browser`.

If the web app was installed using Docker `--cookies-from-browser` will not work. To pass cookies to a job when using Docker:

1. [Export a Netscape formatted cookie file](https://github.com/dandv/convert-chrome-cookies-to-netscape-format) with the cookies for the desired websites 
2. Save the cookies file to the root of your output directory `C:\Output Directory\cookies.txt`
3. In Override config set `--cookies /youtube-dl/cookies.txt`

### How can I update yt-dlp?

You can update yt-dlp from the yt-dlp section of the admin panel. This will run the value of the `YOUTUBE_DL_UPDATE_COMMAND` environment variable.

### How can I add channel/uploader icons to the web app?

Channel/uploader icons can be downloaded from the Uploader icons section of the admin panel. Icons are downloaded using the third-party service [unavatar.io](https://unavatar.io/). The icon downloader currently only supports YouTube and SoundCloud, other icons must be added manually.

Icons can be added manually to the `./avatars` folder in the output directory. Use the Network tab of the browser DevTools to find the expected filename. 

### I am running out of space. How can I change where videos are downloaded?

To change the output directory stop the web app and set the environment variable `OUTPUT_DIRECTORY` to the new location. Move the contents from the previous output directory to the new one. You do not need to update anything else.

If you need more space than a single hard drive can offer try using a drive pooling solution like [DrivePool](https://stablebit.com/DrivePool).

### How can I delete videos?

Videos can be deleted the Delete videos section of the admin panel.

If you are deleting videos because you are running low on storage be aware that the actual video files are not deleted from the disk until the web app is restarted.

### Where are files generated by yt-dlp such as archive.txt located?

These files are located at the root of the output directory. You can also view them from the Logs section of the admin panel.

### How can I watch videos on my phone or other devices?
You can access the web app from other devices on your local network by replacing `localhost` with the ip address of the device the web app is running on. You can find this by running `ipconfig` on Windows or `ip addr` on Linux. If the web app does not load check if your firewall settings are blocking Node.js or if your router is blocking communication between devices.

### How do I backup my database?
#### Manual Installation
1. Install the [MongoDB Command Line Database Tools](https://www.mongodb.com/try/download/database-tools)
2. Run `mongodump /d youtubeDlDB` to backup the database to the disk
#### Docker Installation
1. Run `docker exec -it youtube-dl-react-viewer-db-1 /bin/bash` to open a new shell session in the database container
2. In the new session run `mongodump /d youtubeDlDB` to backup the database to the disk
3. Exit the session and run `docker cp youtube-dl-react-viewer-db-1:/dump/youtubeDlDB "C:\Your Backups Folder\youtubeDlDB"` to copy the backup from the docker container to your disk

## Planned
Planned features in no particular order. There is no timeline or guarantee features will be added.

**In release 1.2.1:**
- [x] Import already downloaded videos
- [x] Docker container
- [x] Video channel/uploader pages
- [x] Update yt-dlp from the web app

**In release 1.3.0:**
- [x] Watch history
- [x] Video playback resume
- [x] Dark theme
- [x] Verify the integrity of video file hashes
- [x] SponsorBlock integration
- [x] Display video chapters in the player
- [x] Chat replay (YouTube only)

**In release 1.3.1**
- [x] User setting to hide shorts

**In release 1.4.0**
- [x] Return YouTube Dislike integration

**In release 1.4.1**
- [x] API key system

**For future releases:**
- [ ] Create custom playlists, favorites, comments
- [ ] Search and sort for uploaders
- [ ] 3D/VR video playback
- [ ] Refetch updated metadata for downloaded videos
- [ ] Twitch chat replay
- [ ] Stream audio only option
- [ ] API documentation

## License/Credits

- The function `doProbeSync()` in `./youtube-dl-express-backend/exec.js` is based on [node-ffprobe](https://github.com/ListenerApproved/node-ffprobe#readme), [MIT](https://opensource.org/licenses/MIT)
- Created with [facebook/create-react-app](https://github.com/facebook/create-react-app), [MIT](https://opensource.org/licenses/MIT)
- Permission to mirror the videos in the live demo obtained from [Public Domain Films](https://www.youtube.com/channel/UCm0SxTO3_kulT6SE0AAeHOw)
- Original Dockerfile created by [JamoDevNich](https://github.com/JamoDevNich)
- SponsorBlock API from [SponsorBlock](https://sponsor.ajay.app/)
- See packages for additional licenses

## Disclaimer
youtube-dl-react-viewer is free and open-source software. This software is provided "as-is", without warranty of any kind. See the [LICENSE](./LICENSE) file for more details.