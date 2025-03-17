const defaultPlayerSettings = {
    enabled: false,
    defaultPlaybackRate: 1,
    autoplayVideo: true,
    keepPlayerControlsVisible: 'never',
    playerControlsPosition: 'on_video',
    playerControlsScale: 1,
    largePlayButtonEnabled: true,
    seekButtonsEnabled: true,
    forwardSeekButtonSeconds: 10,
    backSeekButtonSeconds: 10,
}

const defaultUserSettings = {
    isSuperuser: false,
    avatar: null,
    username: '',
    password: '',
    desktopPlayerSettings: { ...defaultPlayerSettings, enabled: true },
    tabletPlayerSettings: { ...defaultPlayerSettings },
    mobilePlayerSettings: { ...defaultPlayerSettings },
    hideShorts: false,
    useLargeLayout: true,
    fitThumbnails: true,
    useCircularAvatars: true,
    reportBytesUsingIec: true,
    recordWatchHistory: true,
    resumeVideos: true,
    enableSponsorblock: true,
    onlySkipLocked: false,
    skipSponsor: true,
    skipSelfpromo: true,
    skipInteraction: true,
    skipIntro: true,
    skipOutro: true,
    skipPreview: true,
    skipFiller: false,
    skipMusicOfftopic: true,
    enableReturnYouTubeDislike: false,
}

export const getDefaultUserSettings = () => {
    return JSON.parse(JSON.stringify(defaultUserSettings));
}
