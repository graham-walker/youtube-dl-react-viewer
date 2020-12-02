# youtube-dl-react-viewer

<img src="https://gwalkerux.com./uploads/youtube-dl-react-viewer-icon-black-white.png" alt="icon" width="100px" height="100px">

**youtube-dl-react-viewer** is a web app made using the MERN stack to facilitate both the viewing and downloading of videos by parsing the output of [ytdl-org/youtube-dl](https://youtube-dl.org/). The app is not platform specific and should work on any Unix, Windows, or macOS machine.

---

**Support the project**

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K22FCAJ)

---

**I strongly recommend reading the entire readme before attempting to install the web app and download videos.**

- [SCREENSHOTS](#screenshots)
- [FEATURES](#features)
- [INSTALLATION](#installation)
- [RUNNING IN DOCKER](#running-in-docker)
- [CONFIGURING ENVIRONMENT VARIABLES](#configuring-environment-variables)
- [DOWNLOADING](#downloading)
- [IMPORTING ALREADY DOWNLOADED VIDEOS](#importing-already-downloaded-videos)
- [ISSUES & LIMITATIONS](#issues-&-limitations)
- [HANDLING DOWNLOAD ERRORS](#handling-download-errors)
- [FAQ](#faq)
- [PLANNED](#planned)
- [LICENSE/CREDITS](#licensecredits)
- [DISCLAIMER](#disclaimer)

## Screenshots

[Screenshots](https://imgur.com/a/xpa9rPg)

[Live Demo](https://react.gwalkerux.com)

## Features
- View downloaded videos in the browser, with a YouTube like UI
- Download videos from the browser by creating and running "download jobs"
- Support for video subtitles
- Support for live video transcoding
- Native Flash video playback support
- Open any video stream in VLC
- Autoplay & video looping
- Full-text search and sort
- User accounts with individual settings
- Configure a sitewide password to prevent unwanted access
- Automatic creation of playlists for videos downloaded by any specific uploader or download job
- Similar video recommendations based on a video's keywords
- Detailed statistics for downloaded videos
- Hashing of all downloaded files
- Import your old videos already downloaded with youtube-dl

## Installation

1. [Install Python 2.6, 2.7 or 3.2+](https://www.python.org/downloads/) (On Windows you can skip this step)

2. [Install the latest release of youtube-dl](https://github.com/ytdl-org/youtube-dl/blob/master/README.md#installation) (On Windows download the executable binary)

3. [Install the latest versions of ffmpeg and ffprobe](https://ffmpeg.org/download.html) (On Windows download the executable binaries). Make sure you are downloading the "full" version of ffmpeg that includes all the required libraries or you will get merge errors

4. [Install Node.js version >=14.2.0 and npm >=6.0.0](https://nodejs.org/en/download/current/) (youtube-dl-react-viewer will not work with earlier versions of Node.js)

5. [Install mongoDB version >=4.2.8](https://www.mongodb.com/try/download/community)

6. [Download the latest release of youtube-dl-react-viewer](https://github.com/graham-walker/youtube-dl-react-viewer/releases)
    - Unzip the contents of the release to the location of your choosing
    - Configure the environment variables (see the [configuring environment variables section](#configuring-environment-variables))
    - Run `sudo sh install.sh` (run `install.bat` as Administrator on Windows) to install additional dependencies
    - Run `sudo sh start-server.sh` (run `start-server.bat` as Administrator on Windows) to start the web app
    - You can also start the web app using the PM2 config file by running the command `sudo pm2 start ./youtube-dl-express-backend/pm2.config.json` (run as Administrator on Windows)
    - Access the web app by navigating to `http://localhost:5000` in your browser
    - View the console output of the web app's server and the spawned youtube-dl process by running `sudo pm2 logs youtube-dl-react-viewer` (run as Administrator on Windows)
    - Stop the web app by running the command `sudo pm2 stop youtube-dl-react-viewer` (run as Administrator on Windows)

7. (Optional) In order to be able to open videos in VLC directly from the browser you must manually register the `vlc://` URL protocol. An installation/guide for how to do this can be found at [stefansundin/vlc-protocol](https://github.com/stefansundin/vlc-protocol/)

8. (Optional) In order to run the web app automatically after startup or after a system reboot you must configure PM2. See these resources for help configuring PM2 on [Linux/MacOS](https://pm2.keymetrics.io/docs/usage/startup/#saving-current-processes) and [Windows](https://stackoverflow.com/questions/42758985/windows-auto-start-pm2-and-node-apps)

## Running in Docker
As of release 1.1.0 youtube-dl-react-viewer supports Docker containers.

1. Clone the youtube-dl-react-viewer repository `git clone https://github.com/graham-walker/youtube-dl-react-viewer`

2. Set the working directory to `./youtube-dl-react-viewer`

3. To select the version of the release you want to install run `git checkout tags/v1.1.1`

4. Specify the Docker container's environment variables by editing the `environment:` option inside of `docker-compose.yaml`
    - The web app will not start if the values for the environment variables `SUPERUSER_PASSWORD` and `JWT_TOKEN_SECRET` are their default values. A full list of supported variables is shown in the [section below](#configuring-environment-variables)

5. Run `sudo docker-compose up -d` to build the image and start the containers

6. For further configuration, access the container's command line by running `docker exec -it youtube-dl-react-viewer_app_1 /bin/sh`
    - The youtube-dl-react-viewer Dockerfile does not include or automatically install a copy of [ytdl-org/youtube-dl](https://youtube-dl.org/). This must be added to the container manually using the command line

7. Access the web app by navigating to `http://localhost:5000` in your browser

## Configuring Environment Variables

The web app's server requires the configuring of several environment variables before you run it for the first time. This can be done either by adding the following environment variables to your system or editing the `.env` file located in the `./youtube-dl-express-backend` folder of the release (you might need to enable view hidden files and folders in your operating system to be able to see this file).
```    
MONGOOSE_URL                    URL used to connect to your database. If the
                                database does not exist it will be created.
BACKEND_PORT                    Port the server will run on.
YOUTUBE_DL_PATH                 Path to youtube-dl. You can also specify a
                                3rd party fork of youtube-dl such as
                                blackjack4494/yt-dlc.
FFMPEG_PATH                     Path to ffmpeg (On Windows youtube-dl does
                                not support environment variables as
                                parameters, use C:/Path/To/ffmpeg.exe
                                instead of ffmpeg).
FFPROBE_PATH                    Path to ffprobe.
THUMBNAIL_QUALITY               Set the quality of the thumbnails generated
                                by the app (1-100).
THUMBNAIL_CHROMA_SUBSAMPLING    Set the chroma subsampling of the thumbnails
                                generated by the app (4:4:4 or 4:2:0).
OUTPUT_DIRECTORY                Location videos will be downloaded to.
SUPERUSER_USERNAME              Username that will be used to create the
                                superuser account.
SUPERUSER_PASSWORD              Password that will be used to create the
                                superuser account.
JWT_TOKEN_SECRET                Secret key used to make authentication
                                secure. For a secure key choose one that is
                                at least 32 characters long.
PAGE_SIZE                       Amount of results that will be returned at
                                once.
SKIP_HASHING                    Skip the hashing of downloaded files.
                                Hashing is not necessary from the app if you
                                are using a robust filesystem like ZFS or a
                                tool like Snapraid.
VERBOSE                         Should the web app's server and the
                                youtube-dl process print debugging
                                information when downloading a video.
NODE_ENV                        Should be set to "production".
```
Additionally, you can set the environment variable `REACT_APP_BRAND` to change the display name of the web app from "youtube-dl Viewer" to something else and you can set the environment variable `REACT_APP_SHOW_KOFI` to show or hide my donation links. Unlike the other variables, the `.env` file that contains these variables is located in `./youtube-dl-react-frontend`. Additionally, for changes to these variables to take effect you will need to rebuild the React app:
1. Change the value of `REACT_APP_BRAND` or `REACT_APP_SHOW_KOFI`
2. Set the working directory to `./youtube-dl-react-frontend`
3. Run `npm install --unsafe-perm`
4. Run `npm run build`

You can also change the web app's favicon in a similar way by replacing `favicon.ico` in the `/public` folder and rebuilding the app.

## Downloading

To download videos through the app you must be signed in with the superuser account:
1. Navigate to the "Admin" panel in the top right dropdown menu.
2. Scroll to the section titled "Edit jobs".
3. Configure options and save the job:
    ```
    Job name                        Display name of the job.
    Format code                     Format code used by youtube-dl when
                                    downloading videos.
    URL list                        URLs that will be downloaded by the job.
                                    URLs can be individual videos, entire
                                    channels, playlists, etc. One URL per
                                    line. Lines starting with "#", ";", or
                                    "]" will be ignored.
    Override config                 Options to be executed on youtube-dl
                                    when downloading. Identical to the
                                    youtube-dl --config-location option. For
                                    example, if you needed a job to be
                                    signed into a website you would enter
                                    "--cookies C:/Path/To/cookies.txt" here.
                                    Lines starting with "#", ";", or "]"
                                    will be ignored.
    Override uploader               Overrides the uploader field in the
                                    database for a video downloaded by the
                                    job. Useful for websites that return no
                                    uploader name but you may personally
                                    know who uploaded the video (like
                                    Streamable).
    ```
4. Scroll up to the section titled "Download".
5. Select the job(s) you want to run. Multiple jobs can be selected at once and will run one at a time until they are all completed. Jobs will run in the order they are selected. You can queue additional jobs to run even if jobs are already running.

<br/>

## Importing Already Downloaded Videos

You can import videos you have already downloaded with youtube-dl into the web app by using the import script. The import script searches a folder for the `.info.json` metadata file generated by youtube-dl. The script then uses the metadata file to identify the downloaded video file and related files such as thumbnails and subtitles. These files are then moved into the web app's output directory and indexed in the database.

Use the import script as follows:
1. Set the working directory to `./youtube-dl-express-backend`
2. Run `sudo npm run import -- -f "/Folder/To/Search" -j "Imported Videos" -c -r` (run as Administrator on Windows)

```    
-f, --folder FOLDER             Folder to search for videos to import.
-j, --job-name NAME             Download job to add imported videos to. All
                                imported videos will appear in the web app
                                as if have been downloaded by the job.
-r, --recursive                 Search subfolders recursively for videos.
-c, --copy                      Copy found video files instead of moving
                                them.
--override-ext EXT              Sometimes the file extension of the
                                downloaded video file found in .info.json
                                metadata file will be incorrect or not
                                present. If you know the video's extension
                                you can set it here to override what the
                                import script will look for.
```

## Issues & Limitations
As youtube-dl supports downloading from many different video sites, there is no guarantee that downloading videos through the youtube-dl-react-viewer app will be successful. However, as long as the youtube-dl website extractor follows the youtube-dl extractor guidelines the app should still support video sites even if they have not been tested and confirmed working. 

Currently, I have tested the app on Windows and Ubuntu and confirmed it working for the following sites: YouTube, Twitch, Streamable, niconico, Bilibili, Vimeo, Newgrounds and SoundCloud.

**Other limitations**
- **Playlists:**
    <br>
    Because youtube-dl only returns one playlist (based on if the video url given to youtube-dl is a playlist, channel, etc.) if you have already downloaded a video and then download a playlist with the same video in it the video will not appear in the playlist in the web app (as it has already been downloaded). To mitigate this, I recommend you download videos in playlists first then download videos from uploaders/channels/individual videos.

- **Formats/Encoding:**
    <br>
    Based on a download job's format code option (and subsequently the downloaded video's encoding and container format) there is a chance that some videos will not play on certain devices or browsers. There is especially limited support for browsers to play `.mkv` files. The app will always try to play `.mkv` files as if they were `.webm` files (this tends to work on Chromium based browsers). If a video does not play you can enable the "Transcode video" option on the page to transcode the video into `.webm` on the fly. However, reliable playback is dependent on the speed of your server machine and the type and quality of the video. Additionally, there is no ability to "seek" the video while the transcoding option is enabled. Alternatively, you can click the "Open in VLC" button on the bottom of the page to open the video stream in VLC.

    Take note that even though browser support is limited, when creating a new download job, the default merge output format is set to `.mkv` (under "Advanced options"). This is to ensure complete compatibility with [TheFrenchGhosty/TheFrenchGhostys-YouTube-DL-Archivist-Scripts](https://github.com/TheFrenchGhosty/TheFrenchGhostys-YouTube-DL-Archivist-Scripts) format code, which is used as the default download job format code. Changing the merge output format in the advanced options of a job could cause ffmpeg to fail to merge the files. For example, trying to merge opus audio into a `.mp4` file will cause the merge to fail. To avoid this, you should consider changing the format code if you change the merge output format.

- **Xattrs:**
    <br>
    Windows does not have xattr support. Videos downloaded on Windows will not have xattrs added to them. This should not limit the functionality of the web app.

- **Windows Filename Limit:**
    <br>
    Windows has a `MAX_PATH` value of 259 characters, meaning it cannot save files with a longer name than that. Because the filename of downloaded videos includes the video title, uploader name and date there is a chance the filename could be longer than what is allowed in Windows. Based on the maximum allowed video title length on YouTube you should not encounter this limit if your output directory is set to the root of your hard drive (i.e., `C:\youtube-dl`). You can also experiment by enabling "NTFS long paths" on Windows to disable the filename limit, but I have not tested the app in that configuration.

- **PM2 and Windows**
    <br>
    When running the app against PM2 on Windows console windows may suddenly appear when running a download job. This is because of how PM2 interacts when the process it is managing spawns sub-processes. If you find this annoying you can run the application against node instead, however, the web app will be stopped when you close the console window and will not restart automatically if crashed:
    ```
    cd youtube-dl-express-backend
    node --require dotenv/config index.js
    ```

## Handling Download Errors

There are two types of errors that can happen while downloading videos:
1. youtube-dl fails to download a video. This could happen for any number of reasons, including a problem with your internet connection, a broken extractor, a video being private, etc. These errors fail silently, and youtube-dl will try to download the video again the next time the job is run. If you notice a video was not downloaded but do not see an error on the Admin page it is most likely because youtube-dl failed to download it.

2. youtube-dl downloads a video successfully, but the app fails to add the video to the database. This could happen because of a failure to parse the metadata provided by youtube-dl or not being to identify all the files downloaded by youtube-dl. youtube-dl will not try to redownload the video file the next time the job is run as it has already successfully downloaded the video file. You can find the error message on the Admin page under the "Failed Downloads" section. There errors should be reported [here](https://github.com/graham-walker/youtube-dl-react-viewer/issues). 

You can attempt to fix the second type of error by clicking "Show Details" and then "Attempt Repair" on the error message. This will tell the web app to run the script that indexes the video in the database again, however, if all conditions are the same it will likely still fail to do so. You may have to wait until a newer release of the web app where the issue causing the error is fixed before attempting the repair again. If successful, the error will be deleted and the video will appear in the web app. If unsuccessful the error will be updated.

## FAQ

**Q:** The version of youtube-dl I installed when configuring the web app is now out of date/not working. Is there any way I can update it automatically?

**A:** You can update youtube-dl inside the web app by going to the admin control panel, navigating to the section titled "youtube-dl" and clicking "Check for updates".
#
**Q:** How can I add uploader icons to the web app?

**A:** You must manually download and add the uploader icons. Open the output directory and place the uploader icons in the `./avatars` folder. The name of the file should match the name of the uploader but with any path unsafe characters replaced with underscores ("_").
#
**Q:** I am running out of space; can I use a second hard drive or change/add another output directory?

**A:** You cannot set a more than one output directory, however, if you need to change your output directory stop the app then change the `OUTPUT_DIRECTORY` environment variable and move the contents of the old output directory into the new one. Paths are stored relative to the output directory, so you do not need to update anything else. If you need more space than a single hard drive offers I would recommend using some sort of drive pooling solution.
#
**Q:** Where files generated by youtube-dl, such as the `archive.txt` file located?

**A:** These files are located at the base of the configured output directory.
#
**Q:** Can I delete a video downloaded in the app?

**A:** There is currently no way to delete a video downloaded in the app. In order to do this manually you will need to delete the files of the video in the `/videos` and `/thumbnails` folders of the output directory, delete the video from the `archive.txt` file in the local directory, and delete the record of the video from the database. Doing this will not affect the global statistics which will now be inaccurate.

## Planned
Planned features in no particular order. If a feature is checked it has been completed but has not made its way into the latest release. There is no timetable for features or any guarantee they will be completed in a timely manner.

- [ ] Dark aware theme
- [ ] Local user statistics (videos viewed, etc.)
- [ ] Local user's ability to create custom playlists, favorites, queue, comments
- [ ] Verify the integrity of (the already) hashed video files
- [ ] Remember where local user left off watching a video
- [ ] SponsorBlock Implementation
- [ ] Search and sort uploaders like videos
- [ ] More graphs for the global statistics page
- [ ] Display video chapters in the video bar
- [ ] 3D/VR video playback support
- [ ] Refetch metadata for already downloaded videos to get updated views, like counts, etc.
- [ ] Include [PetterKraabol/Twitch-Chat-Downloader](https://github.com/PetterKraabol/Twitch-Chat-Downloader) to download the chat for downloaded Twitch livestreams
- [ ] Show video chapter titles in the video player

## License/Credits

- The default youtube-dl format codes located in `./youtube-dl-react-frontend/src/components/Admin/Admin.js` were copied from [TheFrenchGhosty/TheFrenchGhostys-YouTube-DL-Archivist-Scripts](https://github.com/TheFrenchGhosty/TheFrenchGhostys-YouTube-DL-Archivist-Scripts) created by [TheFrenchGhosty](https://github.com/TheFrenchGhosty), [GNU GENERAL PUBLIC LICENSE
Version 3](https://www.gnu.org/licenses/gpl-3.0.en.html)
- The function `doProbeSync()` located in `./youtube-dl-express-backend/exec.js` is based on [node-ffprobe](https://github.com/ListenerApproved/node-ffprobe#readme), [MIT](https://opensource.org/licenses/MIT)
- Created using [facebook/create-react-app](https://github.com/facebook/create-react-app), [MIT](https://opensource.org/licenses/MIT)
- Permission to mirror the content hosted on the live demo was obtained from [Public Domain Films](https://www.youtube.com/channel/UCm0SxTO3_kulT6SE0AAeHOw)
- Dockerfile created by [JamoDevNich](https://github.com/JamoDevNich)

## Disclaimer
**youtube-dl-react-viewer does not contain any code from [ytdl-org/youtube-dl](https://youtube-dl.org/) or any references to downloading or encouraging the downloading of copyrighted works. youtube-dl-react-viewer by itself does not have any capability to download videos and the author does not support using youtube-dl-react-viewer to download or redistribute copyrighted works. youtube-dl-react-viewer can be used for legitimate purposes that do not include the downloading or redistributing of copyrighted works.**
