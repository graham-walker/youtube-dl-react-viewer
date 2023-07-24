<p align="center">
<img src="./youtube-dl-react-frontend/public/logo.svg" alt="icon" width="100px" height="100px" />
<h1 align="center">youtube-dl-react-viewer</h1>

**youtube-dl-react-viewer** is a web app for [yt-dlp](https://github.com/yt-dlp/yt-dlp)/[youtube-dl](https://github.com/ytdl-org/youtube-dl) created using the MERN stack. Supports viewing and downloading videos. **Usage with yt-dlp is assumed but most forks should work.**

📷[Screenshots](https://imgur.com/a/l23b3dZ) | 🌎[Live Demo](https://react.gwalkerux.com)

---

- [FEATURES](#features)
- ✨[INSTALL WITH DOCKER](#docker-installation)✨
- [INSTALL MANUALLY](#manual-installation)
- [ENVIRONMENT VARIABLES](#environment-variables)
- [DOWNLOADING](#downloading)
- [IMPORTING ALREADY DOWNLOADED VIDEOS](#importing-already-downloaded-videos)
- [ISSUES & LIMITATIONS](#issues--limitations)
- [HANDLING DOWNLOAD ERRORS](#handling-download-errors)
- [FAQ](#faq)
- [PLANNED](#planned)
- [LICENSE/CREDITS](#licensecredits)
- [DISCLAIMER](#disclaimer)

---

## Features
- Watch downloaded videos in the browser across your devices
- Download videos by creating and running download jobs
- Import your existing downloads
- SponsorBlock integration
- Watch history and resume playback
- Full-text search and sort
- Subtitle support
- Autoplay & looping
- Open video streams in VLC
- Automatically generated playlists
- Similar video recommendations
- Sitewide password protection
- Dark/OLED dark theme
- Channel icon downloader (YouTube and SoundCloud only)
- Verify the integrity (hash) of downloads
- Download video comments
- YouTube chat replay

## Install

### Docker Installation

1. Clone the repository `git clone https://github.com/graham-walker/youtube-dl-react-viewer`

2. Navigate to `cd ./youtube-dl-react-viewer`

3. Select the release you want to install `git checkout tags/v1.2.1`
    - Installing from main is not recommended as database breaking changes can be made between releases

4. Set the environment variables by editing `docker-compose.yaml`
    - Set `SUPERUSER_USERNAME` to the desired username for the superuser account
    - Set `SUPERUSER_PASSWORD` to the desired password for the superuser account. Value cannot be `'password'` and must be at least 8 characters
    - Set `JWT_TOKEN_SECRET` to any securely generated random string. At least 32 characters is recommended. Value cannot be `'secret'`
    - If using a HTTPS server set `SECURE_COOKIES=true`. If running locally leave the value as `false`
    - If you are not planning on using yt-dlp set the update command for your fork `YOUTUBE_DL_UPDATE_COMMAND=python3 -m pip install your-fork-name`
    - Other [environment variables](#environment-variables) can optionally be set

5. Build the image and start the container `docker compose up -d` (on Linux run as sudo)
    - If using Compose V1 run `docker-compose up -d` instead

6. Install yt-dlp or your preferred fork to the container
    - Open the container command line `docker exec -it youtube-dl-react-viewer-app-1 /bin/sh` (on Linux run as sudo)
    - Install yt-dlp `python3 -m pip install --no-deps -U yt-dlp`

7. View the web app in the browser `http://localhost:5000`
    - Access from other devices on your network by replacing `localhost` with your device ip address (find using `ipconfig` on Windows or `ip addr` on Linux)
    - If this does not work check if your firewall settings are blocking Node.js

8. Downloads can be found in the Docker volume `youtube-dl-react-viewer_ytrv_downloads`

### Manual Installation

1. [Install Python 3.7+](https://www.python.org/downloads/) (this step can be skipped on Windows)

2. [Install yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation) and add `yt-dlp` to PATH

3. [Install the latest versions of FFmpeg and FFprobe](https://ffmpeg.org/download.html) and add `ffmpeg` and `ffprobe` to PATH
4. [Install Node.js 18.16.0 and npm 9.2.0](https://nodejs.org/en/download/current/)

5. [Install MongoDB 6.0.0](https://www.mongodb.com/try/download/community)

6. [Download the Source code (zip) for the latest release of youtube-dl-react-viewer](https://github.com/graham-walker/youtube-dl-react-viewer/releases)
    - Unzip to the location of your choosing
    - Navigate to `cd ./youtube-dl-react-viewer/youtube-dl-express-backend`
    - Copy `.env.sample` to `.env` (you may need to enable view hidden files and folders)
    - Set environment variables by editing `.env`
        - Set `OUTPUT_DIRECTORY` to the location you want to save downloads. Set to an empty directory
            - On Windows it is recommended to use a location as close to the root directory as possible `C:\youtube-dl` to avoid issues with the path length limit
        - Set `SUPERUSER_USERNAME` to the desired username for the superuser account
        - Set `SUPERUSER_PASSWORD` to the desired password for the superuser account. Value cannot be `'password'` and must be at least 8 characters
        - Set `JWT_TOKEN_SECRET` to any securely generated random string. At least 32 characters is recommended. Value cannot be `'secret'`
        - If using a HTTPS server set `SECURE_COOKIES=true`. If running locally leave the value as `false`
        - On Windows make sure `FFMPEG_PATH="C:/Path/To/ffmpeg.exe"` instead of `ffmpeg`. Using PATH for FFmpeg does not work with the web app on Windows
        - If you installed yt-dlp using pip set `YOUTUBE_DL_UPDATE_COMMAND=python3 -m pip install --no-deps -U yt-dlp`
        - Other [environment variables](#environment-variables) can optionally be set
    - Return to the parent directory `cd ..`
    - Install additional dependencies and build the web app `sh install.sh` (on Windows run `install.bat` instead)
    - Start the web app `sh start-server.sh` (on Windows run `start-server.bat` instead)
    - View the web app in the browser `http://localhost:5000`
        - Access from other devices on your network by replacing `localhost` with your device ip address (find using `ipconfig` on Windows or `ip addr` on Linux). If this does not work check if your firewall settings are blocking Node.js
    - View the console output `pm2 logs youtube-dl-react-viewer`
    - Stop the web app `pm2 stop youtube-dl-react-viewer`

### Open URLs in VLC
To open videos using the open in VLC button on PC/Mac you must register the `vlc://` URL protocol. You can do this with [stefansundin/vlc-protocol](https://github.com/stefansundin/vlc-protocol/).

No additional configuration is required for iOS/Android devices.

## Environment Variables
<!-- Do not go past col 80 -->
```
OUTPUT_DIRECTORY                    Location downloads will be saved to
                                    (path, default: '/youtube-dl')

SUPERUSER_USERNAME                  Superuser username. The superuser is
                                    created when the web app is started
                                    (string < 50, default: admin)

SUPERUSER_PASSWORD                  Superuser password. If the value is
                                    `password` or less than 8 characters the 
                                    app will not start
                                    (string > 8 && !== password, default:
                                    password)

JWT_TOKEN_SECRET                    Secret key to sign the JSON Web Token. If
                                    the value is `secret` the app will not
                                    start. Use a securely generated random
                                    string at least 32 characters long
                                    (string !== secret, default: secret)

MONGOOSE_URL                        Database connection URL. If the database
                                    does not exist it will be created
                                    (url, default:
                                    mongodb://127.0.0.1:27017/youtubeDlDB)

BACKEND_PORT                        Port used by the web app
                                    (0-65535, default: 5000)

SECURE_COOKIES                      Only serve cookies over HTTPS. Enable if
                                    not running locally
                                    (true|false, default: false)

YOUTUBE_DL_PATH                     Path to yt-dlp/youtube-dl. Forks should
                                    work as drop in replacements
                                    (path, default: yt-dlp)

FFMPEG_PATH                         Path to FFmpeg
                                    (path, default: ffmpeg)

FFPROBE_PATH                        Path to FFprobe
                                    (path, default: ffprobe)

THUMBNAIL_QUALITY                   JPEG quality level for thumbnails. Does not
                                    effect existing thumbnails
                                    (0-100, default: 80)

THUMBNAIL_CHROMA_SUBSAMPLING        Chroma subsampling for thumbnails. Does not
                                    effect existing thumbnails
                                    (4:4:4|4:2:0, default: 4:4:4)

PAGE_SIZE                           Number of videos that will be loaded per
                                    page
                                    (number >= 1, default: 54)

SKIP_HASHING                        Do not generate hashes when importing
                                    videos
                                    (true|false, default: false)

ENABLE_USER_REGISTRATION            Allow users to create accounts
                                    (true|false: default: true)

DISPLAY_SIMILAR_VIDEOS              Algorithm used to find similar videos. With
                                    lots of videos the algorithm can make page
                                    loads slow. Consider changing or disabling
                                    (complex|simple|disabled, default: complex)

SPONSORBLOCK_API_URL                API used to retrieve sponsor segments
                                    (url, default: https://sponsor.ajay.app/)

EXPOSE_LOCAL_VIDEO_PATH             Expose the local video path to the user to
                                    allow for local VLC playback
                                    (true|false, default: false)

YOUTUBE_DL_UPDATE_COMMAND           Command run when updating youtube-dl from
                                    the admin panel. If not set will run `-U`
                                    (string, default: '')

VERBOSE                             Print detailed error messages to the
                                    console
                                    (true|false, default: false)

NODE_ENV                            Should be set to `production` unless
                                    running in development mode `development`
                                    (string, default: production)

REACT_APP_BRAND                     Name shown in the navbar
                                    (string, default: youtube-dl Viewer)

REACT_APP_CHECK_FOR_UPDATES         Automatically check the GitHub repo for
                                    new releases on the admin page
                                    (true|false, default: true) 

REACT_APP_SHOW_VERSION_TAG          Display the current release version number 
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
                                    alert that it has not been run recently
                                    (number > 0, default: 30)
```
When setting environment variables that start with `REACT_APP_` you will need to rebuild the web app for changes to take effect:
```
cd ./youtube-dl-react-frontend
npm install --unsafe-perm
npm run build
```
You can change the favicon and manifest icons by replacing the files in `./youtube-dl-react-frontend/public` and rebuilding the app.

The repo and check for update URLs are hard coded in `./youtube-dl-react-frontend/src/index.js`.

## Downloading

To download videos from the web app you must be signed in with the superuser account.
1. Navigate to the admin panel `http://localhost:5000/admin`
2. Scroll to the jobs section
3. Create and save a new job

    ```
    Job name                        Job display name

    Format code                     Format code used by yt-dlp/youtube-dl when
                                    downloading videos

    Download audio only             Should only audio be downloaded

    Download comments               Should comments be downloaded. Only works
                                    if using yt-dlp
    
    Recode video                    Convert downloaded videos to mp4 to
                                    increase browser playback compatibility

    URLs                            URLs that will be downloaded by the job.
                                    URLs can be individual videos, channels, 
                                    playlists, etc. One URL per line

    Override config                 Arguments passed to yt-dlp/youtube-dl when
                                    downloading. For example, you can set
                                    `--cookies C:/Path/To/cookies.txt` here

    Override uploader               Overrides the uploader for a video 
                                    downloaded by this job. Useful for websites 
                                    that do not return the uploader name in
                                    metadata
    ```
4. Scroll to download section
5. Select the jobs you want to download. Multiple jobs can be selected. Jobs will run in the order they are started

## Importing Already Downloaded Videos

You can import videos already downloaded with yt-dlp/youtube-dl as long as they were downloaded with the `--write-info-json` option and the `.json` file is in the same folder as the video.

To import videos from the web app you must be signed in with the superuser account.
1. Navigate to the admin panel `http://localhost:5000/admin`
2. Scroll to the import videos section

```    
Folder to import                    Folder on the server computer to import
                                    videos from

Job                                 Job imported videos will be added to.
                                    Imported videos will appear in the web app
                                    as if have been downloaded by this job

Search subfolders                   Search subfolders for videos

Copy files                          Copy files when importing instead of moving
                                    them

Continue on failed                  Continue importing videos if a single video
                                    fails to import

Override ext                        Sometimes the video file extension cannot
                                    be determined by the importer. If you know
                                    the extension you can set it here
```

If the web app was installed using Docker you will need to copy your existing downloads into the Docker volume before they can be imported.

```
docker cp "C:\Your\Existing\Downloads" youtube-dl-react-viewer-app-1:/youtube-dl/TEMP

# Import this folder
/youtube-dl/TEMP
```

## Issues & Limitations
- **Browser Playback:**
    <br/>
    The format code `bestvideo*+bestaudio/best` is used by default. This can sometimes create videos with codecs individual browsers do not support. If a playback error occurs, try any of the following: open in VLC button, enable spoof type, use a different browser, change the format code and redownload.

    To create videos with better browser playback compatibility, try using the format code `(bestvideo[vcodec^=h264]+bestaudio[acodec^=aac])/mp4/best` or enable recode video in job settings (may reduce quality).

- **Playlists:**
    <br/>
    youtube-dl only downloads playlist metadata if a video was downloaded as part of a playlist. If you have already downloaded a video and then download a playlist that includes the same video, it will not appear in the automatically generated playlist in the web app. The best approach to prevent this is to download playlists before downloading individual videos.

- **Xattrs:**
    <br/>
    Windows does not support xattrs. Videos downloaded on Windows will not have xattrs added to them.

- **Windows Path Limit:**
    <br/>
    Windows file paths cannot be longer than 260 characters. To prevent errors where downloaded file names are too long, set the output directory to a location as close to the root directory as possible `C:\youtube-dl`. Alternatively, you can remove the path length limit by [enabling long paths](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation?tabs=registry#enable-long-paths-in-windows-10-version-1607-and-later).

- **PM2 and Windows**
    <br/>
    PM2 is used to manage the web app process if it was installed using the manual install method. On Windows, console windows may briefly appear when starting a download job. This is an issue that occurs when a process PM2 is managing spawns a subprocess. To prevent this you can start the web app with node instead, however, it will not auto restart if it crashes.
    ```
    cd ./youtube-dl-express-backend
    node --require dotenv/config index.js
    ```

## Handling Download Errors

There are two main types of errors that can occur when downloading videos:
1. **youtube-dl fails to download a video**
    <br/>
    This could happen for many reasons: poor internet connection, incompatible format code, broken extractor, private video, etc. These errors are not recorded by the web app, but can be seen in the console output. youtube-dl will try to download the video again the next time the job is run. If you notice a video did not download but do not see an error on the admin page it is most likely because youtube-dl failed to download it.

2. **youtube-dl successfully downloads a video, but the web app fails to import it**
    <br/>
    This could happen if the web app could not read the metadata downloaded by youtube-dl or could not identify the video file, thumbnails, subtitles, etc. youtube-dl will not try to redownload the video as it has been successfully downloaded.
    
    You can attempt to reimport videos from the failed to import section of the admin panel. This will likely still fail until a version of the web app that fixes the issue is released. Report import errors [here](https://github.com/graham-walker/youtube-dl-react-viewer/issues).

## FAQ
**Q:** How do I sign in to websites that require a login?

**A:** You can set cookies for individual jobs to login to websites. Sign in and export a Netscape cookie file for the website. Edit a job, open advanced options and add this line to override config `--cookies "C:/Path/To/cookies.txt"`
#
**Q:** Can I update youtube-dl from the web app?

**A:** You can update youtube-dl from the youtube-dl section of the admin panel.

If you installed youtube-dl with a package manager you may need to set the environment variable `YOUTUBE_DL_UPDATE_COMMAND` to the correct update command.
#
**Q:** How can I add uploader icons to the web app?

**A:** Uploader icons for YouTube and SoundCloud can be downloaded automatically from the uploader icons section of the admin panel.

For other websites uploader icons must be downloaded manually and placed in the `./avatars` folder of the output directory. Use the Network tab of the browser DevTools to find the expected filename. 
#
**Q:** I am running out of space. Can I use a second hard drive or change/add another output directory?

**A:** You cannot set more than one output directory. If you need to change the output directory, stop the web app and change the environment variable `OUTPUT_DIRECTORY`. Move the contents of the previous output directory to the new one. Paths are stored relative to the output directory so you will not need to update anything else.

If you need more space than a single hard drive can offer, use a drive pooling solution like [DrivePool](https://stablebit.com/DrivePool).
#
**Q:** Where files generated by youtube-dl, such as `archive.txt` located?

**A:** These files are located at the root of the output directory. You can also view them from the logs section of the admin panel.
#
**Q:** Can I delete downloaded videos?

**A:** Videos can be deleted from the admin panel, with the option to prevent videos from being redownloaded or not.

If you are deleting videos because you are running low on storage, note that the actual video files are not deleted until the server is restarted.

## Planned
Planned features in no particular order. There is no timeline or guarantee features will be added.

**In latest release (1.2.1):**
- [x] Import already downloaded videos
- [x] Docker container
- [x] Uploader pages
- [x] Update youtube-dl from the web app

**In upcoming release:**
- [x] Watch history
- [x] Video playback resume
- [x] Dark aware theme
- [x] Verify the integrity of video file hashes
- [x] SponsorBlock Implementation
- [x] Display video chapters in the player
- [x] Chat replay (YouTube only)

**Future release:**
- [ ] Create custom playlists, favorites, comments
- [ ] Search and sort for uploaders
- [ ] 3D/VR video playback
- [ ] Refetch updated metadata for downloaded videos
- [ ] Twitch chat replay
- [ ] Stream audio only mode
- [ ] Download job scheduling

## License/Credits

- The function `doProbeSync()` in `./youtube-dl-express-backend/exec.js` is based on [node-ffprobe](https://github.com/ListenerApproved/node-ffprobe#readme), [MIT](https://opensource.org/licenses/MIT)
- Created with [facebook/create-react-app](https://github.com/facebook/create-react-app), [MIT](https://opensource.org/licenses/MIT)
- Permission to mirror the videos in the live demo obtained from [Public Domain Films](https://www.youtube.com/channel/UCm0SxTO3_kulT6SE0AAeHOw)
- Dockerfile created by [JamoDevNich](https://github.com/JamoDevNich)
- SponsorBlock API from [SponsorBlock](https://sponsor.ajay.app/)

## Disclaimer
**youtube-dl-react-viewer does not contain any code from [ytdl-org/youtube-dl](https://youtube-dl.org/). youtube-dl-react-viewer by itself does not have any capability to download videos.**
