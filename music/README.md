# Music playlist

The player reads YouTube links from `music/playlist.json` automatically. To add a track, append an object to the `tracks` array:

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "title": "Optional track title"
}
```

The `title` field is optional. Supported links include standard YouTube watch URLs, youtu.be links and YouTube embed URLs. Keep the JSON valid (commas between entries, no trailing comma after the final entry). The page uses YouTube's official embedded player; it does not download or extract audio.